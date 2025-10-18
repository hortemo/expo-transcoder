package com.hortemo.expo.transcoder

import com.otaliastudios.transcoder.Transcoder
import com.otaliastudios.transcoder.TranscoderListener
import com.otaliastudios.transcoder.resize.AspectRatioResizer
import com.otaliastudios.transcoder.resize.AtMostResizer
import com.otaliastudios.transcoder.resize.FractionResizer
import com.otaliastudios.transcoder.resize.Resizer
import com.otaliastudios.transcoder.source.ClipDataSource
import com.otaliastudios.transcoder.source.DataSource
import com.otaliastudios.transcoder.source.FilePathDataSource
import com.otaliastudios.transcoder.source.TrimDataSource
import com.otaliastudios.transcoder.strategy.DefaultAudioStrategy
import com.otaliastudios.transcoder.strategy.DefaultVideoStrategy
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.suspendCancellableCoroutine

private class MissingArgumentException(argumentName: String) :
  IllegalArgumentException("Missing required field '$argumentName'")

private enum class DataSourceType(val value: String) : Enumerable {
  TRIM("TrimDataSource"),
  CLIP("ClipDataSource"),
  FILE_PATH("FilePathDataSource")
}

private enum class ResizerType(val value: String) : Enumerable {
  ASPECT_RATIO("AspectRatioResizer"),
  FRACTION("FractionResizer"),
  AT_MOST("AtMostResizer")
}

private class TranscodeOptions : Record {
  @Field var dataSink: String? = null
  @Field var dataSources: List<DataSourceOptions>? = null
  @Field var videoTrackStrategy: VideoStrategyOptions? = null
  @Field var audioTrackStrategy: AudioStrategyOptions? = null
}

private class DataSourceOptions : Record {
  @Field var type: DataSourceType? = null
  @Field var source: DataSourceOptions? = null
  @Field var trimStartUs: Long? = null
  @Field var trimEndUs: Long? = null
  @Field var clipStartUs: Long? = null
  @Field var clipEndUs: Long? = null
  @Field var path: String? = null
}

private fun DataSourceOptions.toDataSource(): DataSource {
  return when (val type = this.type ?: throw MissingArgumentException("type")) {
    DataSourceType.TRIM -> {
      val innerSource = this.source?.toDataSource() ?: throw MissingArgumentException("source")
      val trimStartUs = this.trimStartUs ?: throw MissingArgumentException("trimStartUs")
      val trimEndUs = this.trimEndUs ?: throw MissingArgumentException("trimEndUs")
      TrimDataSource(innerSource, trimStartUs, trimEndUs)
    }
    DataSourceType.CLIP -> {
      val innerSource = this.source?.toDataSource() ?: throw MissingArgumentException("source")
      val clipStartUs = this.clipStartUs ?: throw MissingArgumentException("clipStartUs")
      val clipEndUs = this.clipEndUs ?: throw MissingArgumentException("clipEndUs")
      ClipDataSource(innerSource, clipStartUs, clipEndUs)
    }
    DataSourceType.FILE_PATH -> {
      val path = this.path ?: throw MissingArgumentException("path")
      FilePathDataSource(path)
    }
  }
}

private class VideoStrategyOptions : Record {
  @Field var resizers: List<ResizerOptions>? = null
  @Field var frameRate: Int? = null
  @Field var bitRate: Long? = null
  @Field var keyFrameInterval: Float? = null
}

private fun VideoStrategyOptions.toVideoStrategy(): DefaultVideoStrategy {
  val builder = DefaultVideoStrategy.Builder()
  this.resizers?.forEach { builder.addResizer(it.toResizer()) }
  this.frameRate?.let { builder.frameRate(it) }
  this.bitRate?.let { builder.bitRate(it) }
  this.keyFrameInterval?.let { builder.keyFrameInterval(it) }
  return builder.build()
}

private class ResizerOptions : Record {
  @Field var type: ResizerType? = null
  @Field var aspectRatio: Float? = null
  @Field var fraction: Float? = null
  @Field var atMostMinor: Int? = null
  @Field var atMostMajor: Int? = null
}

private fun ResizerOptions.toResizer(): Resizer {
  return when (val type = this.type ?: throw MissingArgumentException("type")) {
    ResizerType.ASPECT_RATIO -> {
      val aspectRatio = this.aspectRatio ?: throw MissingArgumentException("aspectRatio")
      AspectRatioResizer(aspectRatio)
    }
    ResizerType.FRACTION -> {
      val fraction = this.fraction ?: throw MissingArgumentException("fraction")
      FractionResizer(fraction)
    }
    ResizerType.AT_MOST -> {
      val atMostMinor = this.atMostMinor ?: throw MissingArgumentException("atMostMinor")
      val atMostMajor = this.atMostMajor ?: throw MissingArgumentException("atMostMajor")
      AtMostResizer(atMostMinor, atMostMajor)
    }
  }
}

private class AudioStrategyOptions : Record {
  @Field var channels: Int? = null
  @Field var bitRate: Long? = null
}

private fun AudioStrategyOptions.toAudioStrategy(): DefaultAudioStrategy {
  val builder = DefaultAudioStrategy.Builder()
  this.channels?.let { builder.channels(it) }
  this.bitRate?.let { builder.bitRate(it) }
  return builder.build()
}

class TranscoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Transcoder")

    AsyncFunction("transcode") Coroutine { options: TranscodeOptions ->
      suspendCancellableCoroutine<Int> { continuation ->
        val dataSink = options.dataSink ?: throw MissingArgumentException("dataSink")
        Transcoder.into(dataSink).apply {
          options.dataSources?.forEach { addDataSource(it.toDataSource()) }
          options.videoTrackStrategy?.let { setVideoTrackStrategy(it.toVideoStrategy()) }
          options.audioTrackStrategy?.let { setAudioTrackStrategy(it.toAudioStrategy()) }
          setListener(
            object : TranscoderListener {
              override fun onTranscodeProgress(progress: Double) {}

              override fun onTranscodeCompleted(successCode: Int) {
                continuation.resume(successCode)
              }

              override fun onTranscodeCanceled() {
                continuation.resumeWithException(Exception("Transcode canceled"))
              }

              override fun onTranscodeFailed(exception: Throwable) {
                continuation.resumeWithException(exception)
              }
            }
          )
        }.transcode()
      }
    }
  }
}
