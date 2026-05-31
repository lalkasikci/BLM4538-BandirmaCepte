import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LOGIN_API_URL,
  PROFILE_API_URL,
  REGISTER_API_URL,
} from "../config/api";

const TOKEN_KEY = "bandirma_cepte_token";
const USER_KEY = "bandirma_cepte_user";

async function readResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "İşlem sırasında bir hata oluştu.");
  }

  return data;
}

async function saveSession(token, user) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function registerUser(email, password) {
  const response = await fetch(REGISTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await readResponse(response);

  await saveSession(data.token, data.user);

  return data;
}

export async function loginUser(email, password) {
  const response = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await readResponse(response);

  await saveSession(data.token, data.user);

  return data;
}

export async function getSavedToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getSavedUser() {
  const savedUser = await AsyncStorage.getItem(USER_KEY);

  return savedUser ? JSON.parse(savedUser) : null;
}

export async function getProfile() {
  const token = await getSavedToken();

  if (!token) {
    return null;
  }

  const response = await fetch(PROFILE_API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return readResponse(response);
}

export async function logoutUser() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}