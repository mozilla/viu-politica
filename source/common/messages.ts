import { browser } from 'webextension-polyfill-ts';
import { ProcessedVideoData } from './dataTypes';

export enum EventType {
	RegretVideo = 'RegretVideo',
	AuthRecorded = 'AuthRecorded',
	SendVideoFeedback = 'SendVideoFeedback',
	VideoBatchRecorded = 'VideoBatchRecorded',
	RegretDetailsSubmitted = 'RegretDetailsSubmitted',
	VideoViewed = 'VideoViewed',
	VideoRegretted = 'VideoRegretted',
}

export enum VideoThumbnailType {
	SidebarRecommendation = 'SidebarRecommendation',
	HomePageRecommendation = 'HomePageRecommendation',
	Other = 'OtherRecommendation',
}

export type VideoViewedEvent = {
	type: EventType.VideoViewed;
	data: ProcessedVideoData;
};

export type VideoBatchRecordedEvent = {
	type: EventType.VideoBatchRecorded;
	batchType: VideoThumbnailType;
	data: ProcessedVideoData[];
};

export type RegretVideoEvent = {
	type: EventType.RegretVideo;
	videoId: string;
	// TODO(revisit)
	triggerOnboarding?: boolean;
};

export type RegretDetailsSubmittedEvent = {
	type: EventType.RegretDetailsSubmitted;
	videoId: string;
	feedbackText: string;
};

export type Message = VideoBatchRecordedEvent | RegretVideoEvent | VideoViewedEvent | RegretDetailsSubmittedEvent;

export type PagePingEvent = {
	type: 'ping';
};
