#include <Arduino.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeMonoBold9pt7b.h>
#include <Preferences.h>
#include "secrets.h"

// Hold this pin LOW on boot to factory reset (avoid GPIO 0 — it conflicts with flashing)
#define RESET_PIN 15

#define EPD_CS   5
#define EPD_DC   17
#define EPD_RST  16
#define EPD_BUSY 4

const unsigned long FETCH_INTERVAL_MS = 10000;

GxEPD2_BW<GxEPD2_213_BN, GxEPD2_213_BN::HEIGHT> display(
  GxEPD2_213_BN(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY)
);

Preferences prefs;
String deviceId;
String deviceSecret;

void showText(const String& text) {
  display.setRotation(1);
  display.setFont(&FreeMonoBold9pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setTextSize(1);
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    const int LINE_HEIGHT = 18;
    const int MAX_X = display.width() - 4;
    int curX = 4, curY = 16;
    display.setCursor(curX, curY);
    for (int i = 0; i < (int)text.length(); i++) {
      char c = text[i];
      if (c == '\n') {
        curY += LINE_HEIGHT;
        curX = 4;
        display.setCursor(curX, curY);
        continue;
      }
      int16_t x1, y1;
      uint16_t w, h;
      char buf[2] = { c, '\0' };
      display.getTextBounds(buf, curX, curY, &x1, &y1, &w, &h);
      if (curX + (int)w > MAX_X) {
        curY += LINE_HEIGHT;
        curX = 4;
        display.setCursor(curX, curY);
      }
      if (curY > display.height()) break;
      display.print(c);
      curX += w;
    }
  } while (display.nextPage());
}

void fetchAndDisplay() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, skipping fetch.");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  JsonDocument reqDoc;
  reqDoc["device_identifier"] = deviceId;
  reqDoc["device_secret"]     = deviceSecret;

  String reqBody;
  serializeJson(reqDoc, reqBody);

  int statusCode = http.POST(reqBody);

  if (statusCode == 200) {
    String payload = http.getString();
    JsonDocument resDoc;
    DeserializationError err = deserializeJson(resDoc, payload);
    if (!err) {
      String note = resDoc["current_note"].as<String>();
      Serial.println("--- Note ---");
      Serial.println(note);
      Serial.println("------------");
      showText(note);
    } else {
      Serial.println("JSON parse error: " + String(err.c_str()));
    }
  } else if (statusCode == 401) {
    Serial.println("Auth failed: wrong ID or password.");
    showText("Auth failed.\nCheck device ID\nand secret.");
  } else {
    Serial.println("HTTP error: " + String(statusCode));
  }

  http.end();
}

void setup() {
  Serial.begin(9600);
  display.init(9600);
  pinMode(RESET_PIN, INPUT_PULLUP);

  // Hold RESET_PIN LOW for 3s on boot to wipe all saved settings
  if (digitalRead(RESET_PIN) == LOW) {
    showText("Resetting...\nKeep holding.");
    delay(3000);
    if (digitalRead(RESET_PIN) == LOW) {
      WiFiManager wm;
      wm.resetSettings();
      prefs.begin("moondeck", false);
      prefs.clear();
      prefs.end();
      showText("Reset done.\nRestarting...");
      delay(2000);
      ESP.restart();
    }
  }

  // Load saved device credentials
  prefs.begin("moondeck", true);
  deviceId     = prefs.getString("device_id", "");
  deviceSecret = prefs.getString("device_secret", "");
  prefs.end();

  WiFiManager wm;

  WiFiManagerParameter paramDeviceId("device_id", "Device ID", deviceId.c_str(), 64);
  WiFiManagerParameter paramDeviceSecret("device_secret", "Device Secret", deviceSecret.c_str(), 64);
  wm.addParameter(&paramDeviceId);
  wm.addParameter(&paramDeviceSecret);

  bool configSaved = false;
  wm.setSaveParamsCallback([&configSaved]() {
    configSaved = true;
  });

  wm.setAPCallback([](WiFiManager*) {
    showText("Setup mode:\nConnect to WiFi\n'MoonDeck-Setup'\nthen open\n192.168.4.1");
  });

  showText("Connecting\nto WiFi...");

  if (!wm.autoConnect("MoonDeck-Setup")) {
    showText("WiFi failed.\nRestarting...");
    delay(3000);
    ESP.restart();
  }

  // Portal was shown and user saved — persist device credentials then restart clean
  if (configSaved) {
    prefs.begin("moondeck", false);
    prefs.putString("device_id", String(paramDeviceId.getValue()));
    prefs.putString("device_secret", String(paramDeviceSecret.getValue()));
    prefs.end();
    showText("Saved!\nRestarting...");
    delay(2000);
    ESP.restart();
  }

  fetchAndDisplay();
}

void loop() {
  delay(FETCH_INTERVAL_MS);
  fetchAndDisplay();
}
