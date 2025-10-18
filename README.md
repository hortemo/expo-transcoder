# @hortemo/expo-transcoder

React Native (Expo) wrapper for [Otalia Studios Transcoder](https://github.com/natario1/Transcoder).

## Installation

```sh
npm install @hortemo/expo-transcoder
```

## Usage

```ts
import Transcoder, {
  DataSourceType,
  ResizerType,
} from "@hortemo/expo-transcoder";

const successCode = await Transcoder.transcode({
  dataSink: "/path/to/input.mp4",
  dataSources: [
    {
      type: DataSourceType.TrimDataSource,
      trimStartUs: 5_000_000,
      trimEndUs: 10_000_000,
      source: {
        type: DataSourceType.FilePathDataSource,
        path: "/path/to/output.mp4",
      },
    },
  ],
  videoTrackStrategy: {
    resizers: [
      {
        type: ResizerType.AtMostResizer,
        atMostMajor: 1080,
        atMostMinor: 1920,
      },
    ],
    bitRate: 5_000_000,
  },
});
```
