/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// AUTOGENERATED BY glean_parser. DO NOT EDIT. DO NOT COMMIT.

import StringMetricType from "@mozilla/glean/private/metrics/string";
import TextMetricType from "@mozilla/glean/private/metrics/text";

/**
 * Regret Id (matches the regret id in the regret action event)
 *
 * Generated from `regret_details.regret_id`.
 */
export const regretId = new StringMetricType({
    category: "regret_details",
    name: "regret_id",
    sendInPings: ["regret-details"],
    lifetime: "ping",
    disabled: false,
});

/**
 * Video UUID (not to be confused with YT video id)
 *
 * Generated from `regret_details.video_data_id`.
 */
export const videoDataId = new StringMetricType({
    category: "regret_details",
    name: "video_data_id",
    sendInPings: ["regret-details"],
    lifetime: "ping",
    disabled: false,
});

/**
 * Uniquely generated id identifying a video page view
 *
 * Generated from `regret_details.page_view_id`.
 */
export const pageViewId = new StringMetricType({
    category: "regret_details",
    name: "page_view_id",
    sendInPings: ["regret-details"],
    lifetime: "ping",
    disabled: false,
});

/**
 * Regret feedback text
 *
 * Generated from `regret_details.feedback_text`.
 */
export const feedbackText = new TextMetricType({
    category: "regret_details",
    name: "feedback_text",
    sendInPings: ["regret-details"],
    lifetime: "ping",
    disabled: false,
});


