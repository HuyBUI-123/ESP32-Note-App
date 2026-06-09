#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "Your WiFi SSID";
const char* WIFI_PASSWORD = "Your WiFi Password";

const char* SERVER_URL       = "http://localhost:3000/api/device/note";
const char* DEVICE_ID        = "device_id";
const char* DEVICE_SECRET    = "device_secret";

const unsigned long FETCH_INTERVAL_MS = 10000;

void setup() {
  Serial.begin(9600);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected. IP: " + WiFi.localIP().toString());
}

void fetchNote() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping fetch.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<128> reqDoc;
  reqDoc["device_identifier"] = DEVICE_ID;
  reqDoc["device_secret"]     = DEVICE_SECRET;

  String reqBody;
  serializeJson(reqDoc, reqBody);

  int statusCode = http.POST(reqBody);

  if (statusCode == 200) {
    String payload = http.getString();

    StaticJsonDocument<256> resDoc;
    DeserializationError err = deserializeJson(resDoc, payload);

    if (!err) {
      const char* note = resDoc["current_note"];
      Serial.println("--- Note ---");
      Serial.println(note);
      Serial.println("------------");
    } else {
      Serial.println("JSON parse error: " + String(err.c_str()));
    }
  } else if (statusCode == 401) {
    Serial.println("Auth failed: wrong ID or password.");
  } else {
    Serial.println("HTTP error: " + String(statusCode));
  }

  http.end();
}

void loop() {
  fetchNote();
  delay(FETCH_INTERVAL_MS);
}
