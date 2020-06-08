import {
  HttpRedirect,
  HttpRequest,
  HttpResponse,
  JavascriptCookieRecord,
  JavascriptOperation,
  Navigation,
  UiInteraction,
  UiState,
} from "@openwpm/webext-instrumentation";
import { CapturedContent, LogEntry } from "./openWpmPacketHandler";
import { isoDateTimeStringsWithinFutureSecondThreshold } from "./lib/dateUtils";
import { captureExceptionWithExtras } from "../shared-resources/ErrorReporting";

declare namespace browser.alarms {
  function create(
    name: string,
    alarmInfo: {
      /** Time when the alarm is scheduled to first fire, in milliseconds past the epoch. */
      when?: number;
      /** Number of minutes from the current time after which the alarm should first fire. */
      delayInMinutes?: number;
      /** Number of minutes after which the alarm should recur repeatedly. */
      periodInMinutes?: number;
    },
  ): void;
  function clear(name: string): boolean;
}

declare namespace browser.alarms.onAlarm {
  function addListener(listener: any);
  function removeListener(listener: any);
}

declare namespace browser.runtime {
  const id: any;
}

export interface NavigationBatch {
  navigationEnvelope: OpenWpmPayloadEnvelope;
  childEnvelopes: OpenWpmPayloadEnvelope[];
  httpRequestCount: number;
  httpResponseCount: number;
  httpRedirectCount: number;
  javascriptOperationCount: number;
  capturedContentCount: number;
  uiInteractionCount: number;
  uiStateCount: number;
}

export interface TrimmedNavigationBatch extends NavigationBatch {
  trimmedHttpRequestCount: number;
  trimmedHttpResponseCount: number;
  trimmedHttpRedirectCount: number;
  trimmedJavascriptOperationCount: number;
  trimmedCapturedContentCount: number;
  trimmedUiInteractionCount: number;
  trimmedUiStateCount: number;
}

export interface TrimmedNavigationBatchesByUuid {
  [navigationUuid: string]: TrimmedNavigationBatch;
}

export type OpenWPMType =
  | "navigations"
  | "navigation_batches"
  | "trimmed_navigation_batches"
  | "http_requests"
  | "http_responses"
  | "http_redirects"
  | "javascript"
  | "javascript_cookies"
  | "openwpm_log"
  | "openwpm_captured_content"
  | "ui_interactions"
  | "ui_states";

type OpenWPMPayload =
  | Navigation
  | NavigationBatch
  | TrimmedNavigationBatch
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation
  | JavascriptCookieRecord
  | LogEntry
  | CapturedContent
  | UiInteraction
  | UiState;

type BatchableChildOpenWPMPayload =
  | HttpRequest
  | HttpResponse
  | HttpRedirect
  | JavascriptOperation
  | CapturedContent
  | UiInteraction
  | UiState;

/**
 * An envelope that allows for grouping of different
 * types of OpenWPM packets together while maintaining
 * type checking
 */
export interface OpenWpmPayloadEnvelope {
  type: OpenWPMType;
  navigation?: Navigation;
  navigationBatch?: NavigationBatch;
  trimmedNavigationBatch?: TrimmedNavigationBatch;
  httpRequest?: HttpRequest;
  httpResponse?: HttpResponse;
  httpRedirect?: HttpRedirect;
  javascriptOperation?: JavascriptOperation;
  javascriptCookieRecord?: JavascriptCookieRecord;
  logEntry?: LogEntry;
  capturedContent?: CapturedContent;
  uiInteraction?: UiInteraction;
  uiState?: UiState;
}

export const batchableChildOpenWpmPayloadFromOpenWpmPayloadEnvelope = (
  openWpmPayloadEnvelope: OpenWpmPayloadEnvelope,
): BatchableChildOpenWPMPayload => {
  switch (openWpmPayloadEnvelope.type) {
    case "http_requests":
      return openWpmPayloadEnvelope.httpRequest as HttpRequest;
    case "http_responses":
      return openWpmPayloadEnvelope.httpResponse as HttpResponse;
    case "http_redirects":
      return openWpmPayloadEnvelope.httpRedirect as HttpRedirect;
    case "javascript":
      return openWpmPayloadEnvelope.javascriptOperation as JavascriptOperation;
    case "openwpm_captured_content":
      return openWpmPayloadEnvelope.capturedContent as CapturedContent;
    case "ui_interactions":
      return openWpmPayloadEnvelope.uiInteraction as UiInteraction;
    case "ui_states":
      return openWpmPayloadEnvelope.uiState as UiState;
  }
  throw new Error(`Unexpected type supplied: '${openWpmPayloadEnvelope.type}'`);
};

export const openWpmPayloadEnvelopeFromOpenWpmTypeAndPayload = (
  type: OpenWPMType,
  payload: OpenWPMPayload,
): OpenWpmPayloadEnvelope => {
  const openWpmPayloadEnvelope: OpenWpmPayloadEnvelope = {
    type,
    navigation: type === "navigations" ? (payload as Navigation) : undefined,
    navigationBatch:
      type === "navigation_batches" ? (payload as NavigationBatch) : undefined,
    trimmedNavigationBatch:
      type === "trimmed_navigation_batches"
        ? (payload as TrimmedNavigationBatch)
        : undefined,
    httpRequest:
      type === "http_requests" ? (payload as HttpRequest) : undefined,
    httpResponse:
      type === "http_responses" ? (payload as HttpResponse) : undefined,
    httpRedirect:
      type === "http_redirects" ? (payload as HttpRedirect) : undefined,
    javascriptOperation:
      type === "javascript" ? (payload as JavascriptOperation) : undefined,
    javascriptCookieRecord:
      type === "javascript_cookies"
        ? (payload as JavascriptCookieRecord)
        : undefined,
    logEntry: type === "openwpm_log" ? (payload as LogEntry) : undefined,
    capturedContent:
      type === "openwpm_captured_content"
        ? (payload as CapturedContent)
        : undefined,
    uiInteraction:
      type === "ui_interactions" ? (payload as UiInteraction) : undefined,
    uiState: type === "ui_states" ? (payload as UiState) : undefined,
  };
  return openWpmPayloadEnvelope;
};

const removeItemFromArray = (ar, el) => {
  ar.splice(ar.indexOf(el), 1);
};

/**
 * Groups incoming payloads by navigation.
 * The strange implementation of the processing is mainly
 * due to the flexible ordering of the incoming payloads,
 * eg payloads related to a specific navigation may arrive before
 * the corresponding navigation.
 */
export class NavigationBatchPreprocessor {
  /**
   * Optionally overrided hook that allows for inspection and/or modification of
   * navigation batches at the end of the processing flow.
   */
  public processedNavigationBatchTrimmer: (
    navigationBatch: NavigationBatch,
  ) => Promise<TrimmedNavigationBatch> = async (
    navigationBatch: TrimmedNavigationBatch,
  ): Promise<TrimmedNavigationBatch> => {
    return {
      ...navigationBatch,
      trimmedHttpRequestCount: -1,
      trimmedHttpResponseCount: -1,
      trimmedHttpRedirectCount: -1,
      trimmedJavascriptOperationCount: -1,
      trimmedCapturedContentCount: -1,
      trimmedUiInteractionCount: -1,
      trimmedUiStateCount: -1,
    };
  };
  public openWpmPayloadEnvelopeProcessQueue: OpenWpmPayloadEnvelope[] = [];
  public navigationBatchesByNavigationUuid: TrimmedNavigationBatchesByUuid = {};

  async submitOpenWPMPayload(type: OpenWPMType, payload: any) {
    // console.log({ type, payload });
    const openWpmPayloadEnvelope: OpenWpmPayloadEnvelope = {
      ...openWpmPayloadEnvelopeFromOpenWpmTypeAndPayload(type, payload),
    };
    return this.queueOrIgnore(openWpmPayloadEnvelope);
  }

  private async queueOrIgnore(openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) {
    // Any http or javascript packet with window, tab and frame ids are
    // sent for batching by corresponding navigation
    // or dropped (if no corresponding navigation showed up)
    if (this.shouldBeBatched(openWpmPayloadEnvelope)) {
      this.queueForProcessing(openWpmPayloadEnvelope);
      return;
    }

    // Ignoring non-batchable payloads currently
    // return this.foo(openWpmPayloadEnvelope);
  }

  public queueForProcessing(openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) {
    this.openWpmPayloadEnvelopeProcessQueue.push(openWpmPayloadEnvelope);
  }

  public shouldBeBatched(openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) {
    if (openWpmPayloadEnvelope.type === "navigations") {
      return true;
    }
    return (
      this.batchableChildOpenWpmType(openWpmPayloadEnvelope.type) &&
      this.childCanBeMatchedToWebNavigationFrame(
        batchableChildOpenWpmPayloadFromOpenWpmPayloadEnvelope(
          openWpmPayloadEnvelope,
        ),
      )
    );
  }

  private batchableChildOpenWpmType(type: OpenWPMType) {
    return [
      "http_requests",
      "http_responses",
      "http_redirects",
      "javascript",
      "openwpm_captured_content",
      "ui_interactions",
      "ui_states",
    ].includes(type);
  }

  private childCanBeMatchedToWebNavigationFrame(
    payload: BatchableChildOpenWPMPayload,
  ) {
    return (
      payload.extension_session_uuid &&
      payload.window_id > -1 &&
      payload.tab_id > -1 &&
      payload.frame_id > -1 &&
      payload.event_ordinal &&
      payload.time_stamp
    );
  }

  private alarmName: string;

  public async run() {
    this.alarmName = `${browser.runtime.id}:queueProcessorAlarm`;
    const alarmListener = async _alarm => {
      if (_alarm.name !== this.alarmName) {
        return false;
      }
      console.info(
        `Processing ${this.openWpmPayloadEnvelopeProcessQueue.length} study payloads to group by navigation`,
      );
      await this.processQueue();
    };
    browser.alarms.onAlarm.addListener(alarmListener);
    browser.alarms.create(this.alarmName, {
      periodInMinutes: 10 / 60, // every 10 seconds
    });
  }

  public async cleanup() {
    if (this.alarmName) {
      await browser.alarms.clear(this.alarmName);
    }
    this.openWpmPayloadEnvelopeProcessQueue = [];
    this.navigationBatchesByNavigationUuid = {};
  }

  /**
   * Removes study payload envelopes from the queue, grouped by their presumed
   * originating web navigations
   * @param nowDateTime
   */
  public async processQueue(nowDateTime: Date = new Date()) {
    const navigationAgeThresholdInSeconds: number = 60 * 60 * 5;
    const orphanAgeThresholdInSeconds: number = 25;

    // Flush current queue for processing (we will later put back
    // elements that should be processed in an upcoming iteration)
    const { openWpmPayloadEnvelopeProcessQueue } = this;
    this.openWpmPayloadEnvelopeProcessQueue = [];

    // Navigations ...
    const webNavigationOpenWpmPayloadEnvelopes = openWpmPayloadEnvelopeProcessQueue.filter(
      (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
        return openWpmPayloadEnvelope.type === "navigations";
      },
    );

    // ... that are more than navigationAgeThresholdInSeconds seconds old
    const navigationIsOldEnoughToBePurged = (navigation: Navigation) => {
      return !isoDateTimeStringsWithinFutureSecondThreshold(
        navigation.committed_time_stamp,
        nowDateTime.toISOString(),
        navigationAgeThresholdInSeconds,
      );
    };

    const sameFrame = (
      subject: BatchableChildOpenWPMPayload | Navigation,
      navigation: Navigation,
    ) => {
      return (
        subject.extension_session_uuid === navigation.extension_session_uuid &&
        subject.window_id === navigation.window_id &&
        subject.tab_id === navigation.tab_id &&
        subject.frame_id === navigation.frame_id
      );
    };

    const withinNavigationEventOrdinalBounds = (
      eventOrdinal: number,
      fromEventOrdinal: number,
      toEventOrdinal: number,
    ) => {
      return fromEventOrdinal < eventOrdinal && eventOrdinal < toEventOrdinal;
    };

    const setEnvelopeCounts = $navigationBatch => {
      $navigationBatch.httpRequestCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "http_requests",
      ).length;
      $navigationBatch.httpResponseCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "http_responses",
      ).length;
      $navigationBatch.httpRedirectCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "http_redirects",
      ).length;
      $navigationBatch.javascriptOperationCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "javascript",
      ).length;
      $navigationBatch.capturedContentCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "openwpm_captured_content",
      ).length;
      $navigationBatch.uiInteractionCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "ui_interactions",
      ).length;
      $navigationBatch.uiStateCount = $navigationBatch.childEnvelopes.filter(
        env => env.type === "ui_states",
      ).length;
    };

    // console.log("debug processQueue", openWpmPayloadEnvelopeProcessQueue.length, webNavigationOpenWpmPayloadEnvelopes.length);
    // console.log("JSON.stringify(openWpmPayloadEnvelopeProcessQueue)", JSON.stringify(openWpmPayloadEnvelopeProcessQueue));

    // For each navigation...
    const reprocessingQueue: OpenWpmPayloadEnvelope[] = [];
    const httpResponseEnvelopesMissingTheirRequestCounterpartsByNavigationUuid: {
      [uuid: string]: OpenWpmPayloadEnvelope[];
    } = {};
    await Promise.all(
      webNavigationOpenWpmPayloadEnvelopes.map(
        async (webNavigationOpenWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
          const navigation: Navigation =
            webNavigationOpenWpmPayloadEnvelope.navigation;
          const purge = navigationIsOldEnoughToBePurged(navigation);

          // console.log({ navigation, purge });

          const navigationBatch: NavigationBatch = {
            navigationEnvelope: webNavigationOpenWpmPayloadEnvelope,
            childEnvelopes: [],
            httpRequestCount: 0,
            httpResponseCount: 0,
            httpRedirectCount: 0,
            javascriptOperationCount: 0,
            capturedContentCount: 0,
            uiInteractionCount: 0,
            uiStateCount: 0,
          };

          // Remove navigation envelope from this run's processing queue
          removeItemFromArray(
            openWpmPayloadEnvelopeProcessQueue,
            webNavigationOpenWpmPayloadEnvelope,
          );

          // ... but be sure to re-add it afterwards to ensure that the navigation
          // stays available for processing of future payloads (until the
          // navigation is old enough to be purged / ignored)
          if (!purge) {
            reprocessingQueue.push(webNavigationOpenWpmPayloadEnvelope);
          }

          // Find potential subsequent same-frame navigations
          const subsequentNavigationsMatchingThisNavigationsFrame = openWpmPayloadEnvelopeProcessQueue.filter(
            (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
              switch (openWpmPayloadEnvelope.type) {
                case "navigations":
                  return (
                    sameFrame(openWpmPayloadEnvelope.navigation, navigation) &&
                    withinNavigationEventOrdinalBounds(
                      openWpmPayloadEnvelope.navigation
                        .before_navigate_event_ordinal,
                      navigation.before_navigate_event_ordinal,
                      Number.MAX_SAFE_INTEGER,
                    )
                  );
              }
              return false;
            },
          );

          // console.log("subsequentNavigationsMatchingThisNavigationsFrame.length", subsequentNavigationsMatchingThisNavigationsFrame.length,);

          // Assign matching children to this navigation
          const fromEventOrdinal = navigation.before_navigate_event_ordinal;
          const toEventOrdinal =
            subsequentNavigationsMatchingThisNavigationsFrame.length === 0
              ? Number.MAX_SAFE_INTEGER
              : subsequentNavigationsMatchingThisNavigationsFrame[0].navigation
                  .before_navigate_event_ordinal;

          // Only non-navigations can be assigned navigation parents
          const childCandidates = openWpmPayloadEnvelopeProcessQueue.filter(
            (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
              return this.batchableChildOpenWpmType(
                openWpmPayloadEnvelope.type,
              );
            },
          );

          // console.log("childCandidates.length", childCandidates.length);

          childCandidates.forEach(
            (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
              // Which are found in the same frame and navigation event ordinal bounds
              const payload: BatchableChildOpenWPMPayload = batchableChildOpenWpmPayloadFromOpenWpmPayloadEnvelope(
                openWpmPayloadEnvelope,
              ) as BatchableChildOpenWPMPayload;
              const isSameFrame = sameFrame(payload, navigation);
              const isWithinNavigationEventOrdinalBounds = withinNavigationEventOrdinalBounds(
                payload.event_ordinal,
                fromEventOrdinal,
                toEventOrdinal,
              );
              const isWithinNavigationEventAgeThreshold = isoDateTimeStringsWithinFutureSecondThreshold(
                navigation.committed_time_stamp,
                payload.time_stamp,
                navigationAgeThresholdInSeconds,
              );
              // console.log("openWpmPayloadEnvelope.type, isSameFrame, isWithinNavigationEventOrdinalBounds, isWithinNavigationEventAgeThreshold", openWpmPayloadEnvelope.type, isSameFrame, isWithinNavigationEventOrdinalBounds, isWithinNavigationEventAgeThreshold);
              if (isSameFrame && isWithinNavigationEventOrdinalBounds) {
                if (isWithinNavigationEventAgeThreshold) {
                  navigationBatch.childEnvelopes.push(openWpmPayloadEnvelope);
                  setEnvelopeCounts(navigationBatch);
                }
                // Remove from queue since it has been adopted by a navigation batch
                removeItemFromArray(
                  openWpmPayloadEnvelopeProcessQueue,
                  openWpmPayloadEnvelope,
                );
              }
            },
          );

          // Sometimes http request envelopes were created within the lifespan of a previous webNavigation
          // thus we need to check for http responses without http request counterparts
          navigationBatch.childEnvelopes
            .filter(
              (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) =>
                openWpmPayloadEnvelope.type === "http_responses",
            )
            .forEach((openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
              const currentHttpResponseEnvelope = openWpmPayloadEnvelope;
              const httpRequestEnvelopeMatcher = childEnvelope =>
                childEnvelope.type === "http_requests" &&
                childEnvelope.httpRequest.request_id ===
                  currentHttpResponseEnvelope.httpResponse.request_id;
              const httpRequestEnvelope = navigationBatch.childEnvelopes
                .reverse()
                .find(httpRequestEnvelopeMatcher);
              if (!httpRequestEnvelope) {
                const a = httpResponseEnvelopesMissingTheirRequestCounterpartsByNavigationUuid;
                if (a[navigation.uuid]) {
                  a[navigation.uuid].push(currentHttpResponseEnvelope);
                } else {
                  a[navigation.uuid] = [currentHttpResponseEnvelope];
                }
              }
            });

          // console.log("navigationBatch.childEnvelopes.length", navigationBatch.childEnvelopes.length);

          if (purge) {
            // Remove from navigationBatchesByNavigationUuid
            delete this.navigationBatchesByNavigationUuid[navigation.uuid];
            delete httpResponseEnvelopesMissingTheirRequestCounterpartsByNavigationUuid[
              navigation.uuid
            ];
          } else {
            // Update navigationBatchesByNavigationUuid
            let updatedNavigationBatch;
            if (this.navigationBatchesByNavigationUuid[navigation.uuid]) {
              const existingNavigationBatch = this
                .navigationBatchesByNavigationUuid[navigation.uuid];
              updatedNavigationBatch = {
                ...existingNavigationBatch,
                childEnvelopes: existingNavigationBatch.childEnvelopes.concat(
                  navigationBatch.childEnvelopes,
                ),
              };
              setEnvelopeCounts(updatedNavigationBatch);
            } else {
              updatedNavigationBatch = navigationBatch;
            }
            updatedNavigationBatch = await this.processedNavigationBatchTrimmer(
              updatedNavigationBatch,
            );
            this.navigationBatchesByNavigationUuid[
              navigation.uuid
            ] = updatedNavigationBatch;
          }
        },
      ),
    );

    // console.log("this.navigationBatchesByNavigationUuid", this.navigationBatchesByNavigationUuid);

    // move stray http request envelopes to the same batch where their response envelope are found
    const navUuidsWithMissingCounterparts = Object.keys(
      httpResponseEnvelopesMissingTheirRequestCounterpartsByNavigationUuid,
    );
    if (navUuidsWithMissingCounterparts.length > 0) {
      navUuidsWithMissingCounterparts.forEach(
        (navUuidWithMissingCounterparts: string) => {
          const httpResponseEnvelopesMissingTheirRequestCounterparts =
            httpResponseEnvelopesMissingTheirRequestCounterpartsByNavigationUuid[
              navUuidWithMissingCounterparts
            ];
          const navigationBatch = this.navigationBatchesByNavigationUuid[
            navUuidWithMissingCounterparts
          ];

          httpResponseEnvelopesMissingTheirRequestCounterparts.forEach(
            (openWpmPayloadEnvelope: OpenWpmPayloadEnvelope) => {
              const currentHttpResponseEnvelope = openWpmPayloadEnvelope;
              const httpRequestEnvelopeMatcher = childEnvelope =>
                childEnvelope.type === "http_requests" &&
                childEnvelope.httpRequest.request_id ===
                  currentHttpResponseEnvelope.httpResponse.request_id;

              // check other navigation batches for the stray envelopes
              const navUuidsToCheck = Object.keys(
                this.navigationBatchesByNavigationUuid,
              ).filter(
                navUuidToCheck =>
                  navUuidToCheck !== navUuidWithMissingCounterparts,
              );
              let correspondingHttpRequestFound = false;
              navUuidsToCheck.some(navUuidToCheck => {
                const candidateNavigationBatch = this
                  .navigationBatchesByNavigationUuid[navUuidToCheck];
                const matchingHttpRequestEnvelope = candidateNavigationBatch.childEnvelopes
                  .reverse()
                  .find(httpRequestEnvelopeMatcher);
                if (matchingHttpRequestEnvelope) {
                  // remove from candidateNavigationBatch
                  removeItemFromArray(
                    candidateNavigationBatch.childEnvelopes,
                    matchingHttpRequestEnvelope,
                  );
                  setEnvelopeCounts(candidateNavigationBatch);
                  // add the stray envelope to this navigation batch
                  navigationBatch.childEnvelopes.unshift(
                    matchingHttpRequestEnvelope,
                  );
                  setEnvelopeCounts(navigationBatch);
                  correspondingHttpRequestFound = true;
                  return true;
                }
                return false;
              });
              if (!correspondingHttpRequestFound) {
                console.error(
                  `The matching httpRequestEnvelope was not found for request id ${currentHttpResponseEnvelope.httpResponse.request_id}`,
                  {
                    currentHttpResponseEnvelope,
                  },
                );
                captureExceptionWithExtras(
                  new Error(
                    `The matching httpRequestEnvelope was not found for request id ${currentHttpResponseEnvelope.httpResponse.request_id}`,
                  ),
                  {
                    request_id:
                      currentHttpResponseEnvelope.httpResponse.request_id,
                  },
                );
                // remove the http response since it will cause issues downstream if it is kept
                removeItemFromArray(
                  navigationBatch.childEnvelopes,
                  currentHttpResponseEnvelope,
                );
                setEnvelopeCounts(navigationBatch);
              }
            },
          );
        },
      );
    }

    // Restore relevant items to the processing queue
    reprocessingQueue.reverse().map(openWpmPayloadEnvelope => {
      this.openWpmPayloadEnvelopeProcessQueue.unshift(openWpmPayloadEnvelope);
    });

    // Drop only old orphaned items (assumption: whose navigation batches have already
    // been purged and thus not sorted into a queued navigation event above)

    const childIsOldEnoughToBeAnOrphan = (
      payload: BatchableChildOpenWPMPayload,
    ) => {
      return !isoDateTimeStringsWithinFutureSecondThreshold(
        payload.time_stamp,
        nowDateTime.toISOString(),
        orphanAgeThresholdInSeconds,
      );
    };

    const openWpmPayloadEnvelopesWithoutMatchingNavigations = openWpmPayloadEnvelopeProcessQueue;

    const orphanedOpenWpmPayloadEnvelopes = [];

    openWpmPayloadEnvelopesWithoutMatchingNavigations
      .reverse()
      .map(openWpmPayloadEnvelope => {
        const payload: BatchableChildOpenWPMPayload = batchableChildOpenWpmPayloadFromOpenWpmPayloadEnvelope(
          openWpmPayloadEnvelope,
        );

        if (!childIsOldEnoughToBeAnOrphan(payload)) {
          this.openWpmPayloadEnvelopeProcessQueue.unshift(
            openWpmPayloadEnvelope,
          );
        } else {
          orphanedOpenWpmPayloadEnvelopes.unshift(openWpmPayloadEnvelope);
        }
      });

    // console.log("Orphaned items debug", orphanedOpenWpmPayloadEnvelopes);
  }
}
