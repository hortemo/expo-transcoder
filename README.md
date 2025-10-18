# @hortemo/expo-transcoder

Expo module that wraps [Otalia Studios Transcoder](https://github.com/natario1/Transcoder) for straightforward video transcoding on Android.

## Installation

```sh
npm install @hortemo/expo-transcoder
```

## Usage

```ts
import Transcoder from '@hortemo/expo-transcoder';

const successCode = await Transcoder.transcode({
  dataSink: '/tmp/output.mp4',
  dataSources: [
    Transcoder.createTrimDataSource(
      Transcoder.createFilePathDataSource('/tmp/input.mp4'),
      0,
      10_000_000
    ),
  ],
  videoTrackStrategy: {
    resizers: [Transcoder.createAtMostResizer(1080, 1920)],
    bitRate: 5_000_000,
  },
});
```

See `src/Transcoder.ts` for the full set of helpers and options.

## End-to-end tests

```sh
npm run test
```

This spins up an Android emulator (if needed), builds the sample Expo app, and drives the checks via Maestro.
