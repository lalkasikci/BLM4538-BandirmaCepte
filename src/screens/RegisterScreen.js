import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { registerUser } from "../services/authService";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRegister() {
    setErrorMessage("");

    if (!email.trim() || !password || !passwordAgain) {
      setErrorMessage("Lütfen tüm alanları doldurun.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== passwordAgain) {
      setErrorMessage("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    try {
      setLoading(true);

      await registerUser(email.trim(), password);

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>Bandırma Cepte</Text>

        <Text style={styles.title}>Kayıt Ol</Text>

        <Text style={styles.subtitle}>
          Yeni bir hesap oluşturmak için bilgilerinizi girin.
        </Text>

        <Text style={styles.label}>E-posta</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="ornek@mail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Şifre</Text>

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="En az 6 karakter"
          secureTextEntry
        />

        <Text style={styles.label}>Şifre Tekrar</Text>

        <TextInput
          style={styles.input}
          value={passwordAgain}
          onChangeText={setPasswordAgain}
          placeholder="Şifrenizi yeniden yazın"
          secureTextEntry
        />

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.linkText}>
            Zaten hesabınız var mı? Giriş yapın
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F5F7FC",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  logo: {
    color: "#5361FF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
    textAlign: "center",
  },

  title: {
    color: "#182033",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    marginTop: 8,
    textAlign: "center",
  },

  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 14,
    borderWidth: 1,
    color: "#182033",
    fontSize: 15,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    marginBottom: 14,
    padding: 12,
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor: "#5361FF",
    borderRadius: 14,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 50,
  },

  disabledButton: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  linkButton: {
    alignItems: "center",
    marginTop: 18,
  },

  linkText: {
    color: "#5361FF",
    fontSize: 14,
    fontWeight: "700",
  },
});