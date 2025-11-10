import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  Animated,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const BACKEND_URL = "http://10.0.2.2:8000/chat";

const THEME = {
  bg: "#0b0f1a",
  card: "#121828",
  input: "#0f1424",
  user: "#2563eb",
  bot: "#1f2937",
  border: "#1c2340",
  text: "#e5e7eb",
  textMuted: "#9ca3af",
  accent: "#60a5fa",
  danger: "#ef4444",
};

const MODELS = [
  { name: "chatgpt", id: "openai/gpt-oss-20b:free" },
  { name: "deepseek", id: "deepseek/deepseek-chat-v3.1:free" },
  { name: "meta", id: "meta-llama/llama-3.3-8b-instruct:free" },
  { name: "minimax", id: "minimax/minimax-m2:free" },
  { name: "nemotron", id: "nvidia/nemotron-nano-12b-v2-vl:free" },
];

function decodeHtmlEntities(str = "") {
  if (!str) return "";
  return str
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripMarkdown(md = "") {
  if (!md) return "";

  let s = md.replace(/<br\s*\/?>/gi, "\n");

  s = s.replace(/<\/?[^>]+(>|$)/g, "");

  s = decodeHtmlEntities(s);

  s = s.replace(/!\[.*?\]\(.*?\)/g, "");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(\*|_)(.*?)\1/g, "$2");
  s = s.replace(/`{1,3}(.*?)`{1,3}/g, "$1");

  s = s.replace(/^#{1,6}\s*/gm, "");
  s = s.replace(/^\s*>+\s?/gm, "");

  s = s.replace(/^\s*[-*+]\s+/gm, "");
  s = s.replace(/^\s*\d+\.\s+/gm, "");

  s = s.replace(/^[-*_]{3,}$/gm, "");

  s = s
    .split("\n")
    .map((ln) => ln.trim())
    .join("\n")
    .trim();

  return s;
}

function Chat() {
  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "assistant",
      content: "Hi! \nI’m Eula. \nAsk me anything 💬",
      ts: Date.now(),
    },
  ]);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const ref = listRef.current;
      if (ref && typeof ref.scrollToEnd === "function") {
        ref.scrollToEnd({ animated: true });
      } else if (ref && typeof ref.scrollToOffset === "function") {
        ref.scrollToOffset({ offset: 99999, animated: true });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length, typing]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes();
    const hh = (h % 12 || 12).toString();
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hh}:${mm} ${ampm}`;
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;

    const content = text.trim();
    const userMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      content,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setText("");
    setSending(true);
    setTyping(true);

    try {
      const payload = {
        session_id: "mobile-session-1",
        message: content,
        model: selectedModel?.name,
      };

      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const textFallback = await res.text();
        data = { reply: textFallback || "" };
      }

      if (res.ok) {
        const raw = data.reply || "(empty reply)";
        const cleaned = stripMarkdown(raw);
        const botReply = {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: cleaned,
          ts: Date.now(),
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        const errMsg = data?.error || data?.details || "unknown";
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-e`,
            role: "assistant",
            content: `Error: ${errMsg}`,
            ts: Date.now(),
          },
        ]);
        Alert.alert("Server error", errMsg);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-n`,
          role: "assistant",
          content: `Network error: ${String(err)}`,
          ts: Date.now(),
        },
      ]);
      Alert.alert(
        "Network error",
        `Failed to reach backend. Make sure BACKEND_URL is reachable from this device.\n\n${String(
          err
        )}`
      );
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isRecording) {
        startPulseAnimation();
      }
    });
  };

  const startVoiceInput = async () => {
    try {
      setVoiceModalVisible(true);
      setIsRecording(true);
      startPulseAnimation();

      const response = await fetch("http://10.0.2.2:8001/listen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setText(data.text || "");
        setVoiceModalVisible(false);
      } else {
        Alert.alert("Error", "Could not understand audio. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Voice input failed. Please try again.");
    } finally {
      setIsRecording(false);
      setVoiceModalVisible(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const isUser = item.role === "user";
    const sameAsPrev = prev && prev.role === item.role;
    const sameAsNext = next && next.role === item.role;

    const bubbleStyle = [
      styles.bubble,
      isUser ? styles.user : styles.bot,
      sameAsPrev ? (isUser ? styles.roundTopUser : styles.roundTopBot) : {},
      sameAsNext
        ? isUser
          ? styles.roundBottomUser
          : styles.roundBottomBot
        : {},
    ];

    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        <View style={bubbleStyle}>
          <Text style={[styles.contentText, styles.contentTextLight]}>
            {item.content}
          </Text>
          <Text
            style={[styles.time, isUser ? styles.timeRight : styles.timeLeft]}
          >
            {formatTime(item.ts)}
          </Text>
        </View>
      </View>
    );
  };

  const TypingBubble = () => {
    const dots = useTypingDots(350);
    return (
      <View style={[styles.row, styles.rowLeft]}>
        <View style={[styles.bubble, styles.bot, styles.typingBubble]}>
          <Text style={styles.contentTextLight}>Assistant is typing{dots}</Text>
        </View>
      </View>
    );
  };

  const androidTopPadding =
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0;
  const keyboardVerticalOffset = Platform.OS === "ios" ? 8 : insets.bottom || 0;

  const VoiceModal = () => (
    <Modal
      visible={voiceModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setVoiceModalVisible(false);
        setIsRecording(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Animated.View
            style={[
              styles.pulsingCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.micIconLarge}>🎤</Text>
          </Animated.View>
          <Text style={styles.recordingText}>
            {isRecording ? "Listening..." : "Starting..."}
          </Text>
          <Text style={styles.recordingHint}>
            Speak clearly into the microphone
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setVoiceModalVisible(false);
                setIsRecording(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setVoiceModalVisible(false);
                setIsRecording(false);
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ModelSelectorModal = () => (
    <Modal
      visible={modelModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModelModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: "90%", maxWidth: 420 }]}>
          <Text style={[styles.recordingText, { marginBottom: 8 }]}>
            Select model
          </Text>
          <Text style={styles.recordingHint}>
            Currently: {selectedModel?.name}
          </Text>

          <FlatList
            data={MODELS}
            keyExtractor={(m) => m.id}
            style={{ marginTop: 12, width: "100%" }}
            renderItem={({ item }) => {
              const isSelected = item.name === selectedModel?.name;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedModel(item);
                    setModelModalVisible(false);
                  }}
                  style={[
                    styles.modelRow,
                    isSelected && { borderColor: THEME.accent, borderWidth: 1 },
                  ]}
                >
                  <View>
                    <Text style={{ color: THEME.text, fontWeight: "700" }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: THEME.textMuted, fontSize: 12 }}>
                      {item.id}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={{ color: THEME.accent }}>Selected</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModelModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { paddingTop: androidTopPadding }]}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={THEME.card} />
      <View style={styles.header}>
        <View style={styles.statusDot} />
        <Text style={styles.headerTitle}>Eula Chat</Text>

        <TouchableOpacity
          onPress={() => setModelModalVisible(true)}
          style={{ marginLeft: "auto", paddingHorizontal: 8 }}
        >
          <Text style={{ color: THEME.textMuted, fontSize: 13 }}>
            Model:{" "}
            <Text style={{ color: THEME.text, fontWeight: "700" }}>
              {selectedModel?.name}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.chatSurface}>
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: 14,
              paddingBottom: 8 + Math.max(insets.bottom || 0, 12),
            }}
            showsVerticalScrollIndicator={false}
          />
          {typing && <TypingBubble />}
        </View>

        <View
          style={[
            styles.inputRow,
            { paddingBottom: Math.max(insets.bottom || 0, 8) },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder={sending ? "Sending..." : "Type a message"}
            placeholderTextColor={THEME.textMuted}
            value={text}
            onChangeText={setText}
            editable={!sending}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={startVoiceInput}
            style={[styles.micBtn, isRecording && styles.micBtnActive]}
            disabled={sending}
          >
            <Text style={styles.micIcon}>🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            disabled={sending}
            activeOpacity={0.85}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <VoiceModal />
      <ModelSelectorModal />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Chat />
    </SafeAreaProvider>
  );
}

function useTypingDots(speed = 300) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % 4), speed);
    return () => clearInterval(t);
  }, [speed]);
  return ".".repeat(i);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: {
    height: 64,
    backgroundColor: THEME.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.accent,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chatSurface: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  row: { width: "100%", marginBottom: 8, paddingHorizontal: 6 },
  rowLeft: { alignItems: "flex-start" },
  rowRight: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "86%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 6,
  },
  user: { backgroundColor: THEME.user, borderTopRightRadius: 6 },
  bot: { backgroundColor: THEME.bot, borderTopLeftRadius: 6 },
  roundTopUser: { borderTopRightRadius: 16 },
  roundBottomUser: { borderBottomRightRadius: 6 },
  roundTopBot: { borderTopLeftRadius: 16 },
  roundBottomBot: { borderBottomLeftRadius: 6 },
  contentText: { fontSize: 16, lineHeight: 22 },
  contentTextLight: { color: THEME.text },
  time: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  timeRight: { textAlign: "right" },
  timeLeft: { textAlign: "left" },
  typingBubble: {
    marginLeft: 12,
    marginBottom: 10,
    opacity: 0.9,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.card,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.input,
    color: THEME.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: 18,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendText: { color: "#081325", fontWeight: "700", fontSize: 15 },
  micBtn: {
    height: 44,
    width: 44,
    backgroundColor: THEME.input,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  micBtnActive: {
    backgroundColor: THEME.danger,
    borderColor: THEME.danger,
  },
  micIcon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "80%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  pulsingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.danger,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  micIconLarge: {
    fontSize: 32,
  },
  recordingText: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  recordingHint: {
    color: THEME.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: THEME.input,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cancelButtonText: {
    color: THEME.textMuted,
    fontWeight: "600",
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: THEME.accent,
  },
  doneButtonText: {
    color: "#081325",
    fontWeight: "600",
  },
  modelRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: THEME.input,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
