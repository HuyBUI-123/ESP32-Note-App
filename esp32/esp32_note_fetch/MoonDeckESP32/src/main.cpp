#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeMonoBold9pt7b.h>
#include "secrets.h"

const unsigned long FETCH_INTERVAL_MS = 10000;

// WeAct 2.13" wiring to ESP32
#define EPD_CS    5
#define EPD_DC    17
#define EPD_RST   16
#define EPD_BUSY  4

// WeAct 2.13" V1 uses DEPG0213BN (122x250).
// If nothing shows, try swapping to GxEPD2_213_B74 instead.
GxEPD2_BW<GxEPD2_213_BN, GxEPD2_213_BN::HEIGHT> display(
  GxEPD2_213_BN(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY)
);

void showOnDisplay(const String& note) {
  display.setRotation(1); // landscape
  display.setFont(&FreeMonoBold9pt7b);
  display.setTextColor(GxEPD_BLACK);
  display.setTextSize(1);

  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setCursor(4, 16);

    // Simple word-wrap: break line when cursor would exceed display width
    const int LINE_HEIGHT = 18;
    const int MAX_X       = display.width() - 4;
    int curX = 4;
    int curY = 16;

    for (int i = 0; i < (int)note.length(); i++) {
      char c = note[i];

      if (c == '\n') {
        curY += LINE_HEIGHT;
        curX = 4;
        display.setCursor(curX, curY);
        continue;
      }

      // Measure this character
      int16_t x1, y1;
      uint16_t w, h;
      char buf[2] = { c, '\0' };
      display.getTextBounds(buf, curX, curY, &x1, &y1, &w, &h);

      if (curX + (int)w > MAX_X) {
        curY += LINE_HEIGHT;
        curX = 4;
        display.setCursor(curX, curY);
      }

      if (curY > display.height()) break; // no more room

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

  StaticJsonDocument<128> reqDoc;
  reqDoc["device_identifier"] = DEVICE_ID;
  reqDoc["device_secret"]     = DEVICE_SECRET;

  String reqBody;
  serializeJson(reqDoc, reqBody);

  int statusCode = http.POST(reqBody);

  if (statusCode == 200) {
    String payload = http.getString();

    StaticJsonDocument<512> resDoc;
    DeserializationError err = deserializeJson(resDoc, payload);

    if (!err) {
      String note = resDoc["current_note"].as<String>();
      Serial.println("--- Note ---");
      Serial.println(note);
      Serial.println("------------");
      showOnDisplay(note);
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

void setup() {
  Serial.begin(9600);

  display.init(9600);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected. IP: " + WiFi.localIP().toString());

  fetchAndDisplay();
}

void loop() {
  delay(FETCH_INTERVAL_MS);
  fetchAndDisplay();
}
