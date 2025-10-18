import { requireNativeModule } from "expo-modules-core";

export enum DataSourceType {
  FilePathDataSource = "FilePathDataSource",
  TrimDataSource = "TrimDataSource",
  ClipDataSource = "ClipDataSource",
}

export interface FilePathDataSource {
  type: DataSourceType.FilePathDataSource;
  path: string;
}

export interface TrimDataSource {
  type: DataSourceType.TrimDataSource;
  source: DataSource;
  trimStartUs: number;
  trimEndUs: number;
}

export interface ClipDataSource {
  type: DataSourceType.ClipDataSource;
  source: DataSource;
  clipStartUs: number;
  clipEndUs: number;
}

export type DataSource = FilePathDataSource | TrimDataSource | ClipDataSource;

export enum ResizerType {
  AspectRatioResizer = "AspectRatioResizer",
  FractionResizer = "FractionResizer",
  AtMostResizer = "AtMostResizer",
}

export interface AspectRatioResizer {
  type: ResizerType.AspectRatioResizer;
  aspectRatio: number;
}

export interface FractionResizer {
  type: ResizerType.FractionResizer;
  fraction: number;
}

export interface AtMostResizer {
  type: ResizerType.AtMostResizer;
  atMostMinor: number;
  atMostMajor: number;
}

export type Resizer = AspectRatioResizer | FractionResizer | AtMostResizer;

export interface VideoTrackStrategy {
  resizers?: Resizer[];
  frameRate?: number;
  bitRate?: number;
  keyFrameInterval?: number;
}

export interface AudioTrackStrategy {
  channels?: number;
  bitRate?: number;
}

export interface TranscodeOptions {
  dataSink: string;
  dataSources: DataSource[];
  videoTrackStrategy?: VideoTrackStrategy;
  audioTrackStrategy?: AudioTrackStrategy;
}

export enum SuccessCode {
  SUCCESS_TRANSCODED = 0,
  SUCCESS_NOT_NEEDED = 1,
}

export interface TranscoderModule {
  transcode(options: TranscodeOptions): Promise<SuccessCode>;
}

const Transcoder = requireNativeModule<TranscoderModule>("Transcoder");

export default Transcoder;
