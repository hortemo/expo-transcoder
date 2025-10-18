import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import Transcoder, {
  DataSourceType,
  SuccessCode,
} from "@hortemo/expo-transcoder";

type TestId = "scale" | "clip";

type TestStatus = "idle" | "running" | "done" | "error";

type TestState = {
  status: TestStatus;
  errorMessage: string | null;
};

type TestCase = {
  id: TestId;
  label: string;
  run: () => Promise<void>;
};

const SAMPLE_VIDEO_URL =
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4";

const fileUriToPath = (uri: string): string => {
  try {
    return decodeURI(new URL(uri).pathname);
  } catch {
    throw new Error(`Unable to convert URI to file path: ${uri}`);
  }
};

const prepareInputOutput = async (suffix: string) => {
  const inputFile = new FileSystem.File(
    FileSystem.Paths.cache,
    `input-${suffix}.mp4`
  );
  const outputFile = new FileSystem.File(
    FileSystem.Paths.cache,
    `output-${suffix}.mp4`
  );

  const parentDirectory = inputFile.parentDirectory;
  parentDirectory.create({ intermediates: true, idempotent: true });

  if (outputFile.exists) {
    outputFile.delete();
  }

  const downloadedInput = await FileSystem.File.downloadFileAsync(
    SAMPLE_VIDEO_URL,
    inputFile,
    { idempotent: true }
  );

  return {
    inputPath: fileUriToPath(downloadedInput.uri),
    outputPath: fileUriToPath(outputFile.uri),
  };
};

const createClipTest = (): (() => Promise<void>) =>
  async function runClipTest() {
    const { inputPath, outputPath } = await prepareInputOutput("clip");

    const successCode = await Transcoder.transcode({
      dataSink: outputPath,
      dataSources: [
        {
          type: DataSourceType.ClipDataSource,
          source: {
            type: DataSourceType.FilePathDataSource,
            path: inputPath,
          },
          clipStartUs: 4_000_000,
          clipEndUs: 5_000_000,
        },
      ],
    });

    if (successCode !== SuccessCode.SUCCESS_TRANSCODED) {
      throw new Error(`Unexpected success code: ${successCode}`);
    }
  };

const App = (): React.ReactElement => {
  const testCases = useMemo<TestCase[]>(
    () => [
      {
        id: "clip",
        label: "Clip video segment",
        run: createClipTest(),
      },
    ],
    []
  );

  const [state, setState] = useState<Record<TestId, TestState>>(() =>
    testCases.reduce(
      (acc, test) => ({
        ...acc,
        [test.id]: { status: "idle", errorMessage: null },
      }),
      {} as Record<TestId, TestState>
    )
  );

  const handleRun = useCallback(
    async (test: TestCase) => {
      setState((prev) => ({
        ...prev,
        [test.id]: { status: "running", errorMessage: null },
      }));

      try {
        await test.run();
        setState((prev) => ({
          ...prev,
          [test.id]: { status: "done", errorMessage: null },
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          [test.id]: {
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        }));
      }
    },
    [setState]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Expo Transcoder</Text>
        <Text style={styles.subtitle}>
          Run the tests below to verify the native module.
        </Text>

        {testCases.map((test) => {
          const status = state[test.id];
          const isRunning = status.status === "running";

          return (
            <View key={test.id} style={styles.card}>
              <Text style={styles.cardTitle}>{test.label}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleRun(test)}
                disabled={isRunning}
                style={({ pressed }) => [
                  styles.button,
                  isRunning && styles.buttonDisabled,
                  pressed && !isRunning && styles.buttonPressed,
                ]}
                testID={`testButton-${test.id}`}
              >
                <Text style={styles.buttonText}>
                  {isRunning ? "Running..." : "Run test"}
                </Text>
              </Pressable>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text
                  testID={`testStatus-${test.id}`}
                  style={[
                    styles.statusValue,
                    status.status === "done" && styles.statusDone,
                    status.status === "error" && styles.statusError,
                  ]}
                >
                  {status.status}
                </Text>
              </View>
              {status.errorMessage && (
                <Text
                  testID={`testError-${test.id}`}
                  style={styles.errorMessage}
                >
                  {status.errorMessage}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f2f2f7",
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1c6ef2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    backgroundColor: "#9bb8fb",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusDone: {
    color: "#007a3d",
  },
  statusError: {
    color: "#c62828",
  },
  errorMessage: {
    marginTop: 8,
    color: "#c62828",
    fontSize: 12,
  },
});

export default App;
