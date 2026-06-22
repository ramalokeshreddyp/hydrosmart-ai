import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateDailyGoal,
  getReminderInterval,
  getTemperatureLevel,
  getTodayLogs,
  addIntakeLog,
  getIntakeHistory,
  type UserProfile,
  type WeatherData,
} from "../lib/hydration";
import { getLocalDateString } from "../lib/utils";

const mockProfile: UserProfile = {
  name: "Test User",
  weight: 70,
  age: 30,
  city: "New York",
  wakeTime: "07:00",
  sleepTime: "23:00",
  customInterval: 60,
  weatherRemindersEnabled: true,
  channels: ["in-app"],
  email: "test@example.com",
  phone: "1234567890",
  manualGoal: null,
};

describe("hydration.ts - Core Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("calculateDailyGoal", () => {
    it("should return the manual goal if specified", () => {
      const profileWithManual = { ...mockProfile, manualGoal: 3200 };
      expect(calculateDailyGoal(profileWithManual)).toBe(3200);
    });

    it("should calculate base goal correctly (max of 35ml/kg or 2500ml)", () => {
      // 70kg * 35 = 2450ml => max(2450, 2500) = 2500ml
      expect(calculateDailyGoal(mockProfile)).toBe(2500);

      // 100kg * 35 = 3500ml => max(3500, 2500) = 3500ml
      const heavyProfile = { ...mockProfile, weight: 100 };
      expect(calculateDailyGoal(heavyProfile)).toBe(3500);
    });

    it("should adjust goal for high temperatures", () => {
      const warmWeather: WeatherData = {
        temp: 28, // between 25 and 30: +25ml per degree above 25 => (28 - 25) * 25 = +75ml
        humidity: 60, // no humidity adjustment
        description: "Clear sky",
        icon: "☀️",
        city: "New York",
      };
      // Base: 2500 + 75 = 2575ml => rounded to nearest 50 => 2600ml
      expect(calculateDailyGoal(mockProfile, warmWeather)).toBe(2600);

      const hotWeather: WeatherData = {
        temp: 34, // above 30: +50ml per degree above 30 => (34 - 30)*50 = +200ml
        humidity: 60,
        description: "Scorching hot",
        icon: "☀️",
        city: "New York",
      };
      // Base: 2500 + 200 = 2700ml
      expect(calculateDailyGoal(mockProfile, hotWeather)).toBe(2700);
    });

    it("should adjust goal for low humidity", () => {
      const dryWeather: WeatherData = {
        temp: 20, // no temp adjustment
        humidity: 25, // < 30% humidity: +300ml
        description: "Dry wind",
        icon: "🍂",
        city: "New York",
      };
      // Base: 2500 + 300 = 2800ml
      expect(calculateDailyGoal(mockProfile, dryWeather)).toBe(2800);

      const moderateDryWeather: WeatherData = {
        temp: 20,
        humidity: 40, // 30-50% humidity: +150ml
        description: "Pleasant",
        icon: "☀️",
        city: "New York",
      };
      // Base: 2500 + 150 = 2650ml
      expect(calculateDailyGoal(mockProfile, moderateDryWeather)).toBe(2650);
    });
  });

  describe("getReminderInterval", () => {
    it("should return customInterval if weather reminders are disabled or weather is missing", () => {
      const profileDisabled = { ...mockProfile, weatherRemindersEnabled: false };
      expect(getReminderInterval(profileDisabled)).toBe(60);

      const weather: WeatherData = { temp: 42, humidity: 15, description: "Hot", icon: "☀️", city: "New York" };
      expect(getReminderInterval(profileDisabled, weather)).toBe(60);
      expect(getReminderInterval(mockProfile, undefined)).toBe(60);
    });

    it("should adjust reminder interval based on temperature if enabled", () => {
      const coolWeather: WeatherData = { temp: 20, humidity: 50, description: "Cool", icon: "☀️", city: "New York" };
      const warmWeather: WeatherData = { temp: 30, humidity: 50, description: "Warm", icon: "☀️", city: "New York" };
      const hotWeather: WeatherData = { temp: 38, humidity: 50, description: "Hot", icon: "☀️", city: "New York" };
      const extremeWeather: WeatherData = { temp: 42, humidity: 50, description: "Extreme", icon: "☀️", city: "New York" };

      expect(getReminderInterval(mockProfile, coolWeather)).toBe(90);
      expect(getReminderInterval(mockProfile, warmWeather)).toBe(60);
      expect(getReminderInterval(mockProfile, hotWeather)).toBe(45);
      expect(getReminderInterval(mockProfile, extremeWeather)).toBe(30);
    });
  });

  describe("getTemperatureLevel", () => {
    it("should return the correct level based on temperature range", () => {
      expect(getTemperatureLevel(15)).toBe("cool");
      expect(getTemperatureLevel(25)).toBe("warm");
      expect(getTemperatureLevel(32)).toBe("hot");
      expect(getTemperatureLevel(40)).toBe("extreme");
    });
  });

  describe("timezone local date logging and history", () => {
    it("should filter today's logs correctly based on local timezone", () => {
      // Simulate today in local date
      const todayLocalStr = getLocalDateString();

      // Create a log in UTC representing a time that maps to todayLocalStr
      // If we use the current date's UTC timestamp, it should be parsed correctly
      const localNow = new Date();
      const log = addIntakeLog(250);
      
      const todayLogs = getTodayLogs();
      expect(todayLogs.length).toBe(1);
      expect(todayLogs[0].amount).toBe(250);

      // Create a log that was recorded 2 days ago (local time)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoUTC = twoDaysAgo.toISOString();

      const allLogs = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
      allLogs.push({
        id: "old-log-id",
        amount: 500,
        timestamp: twoDaysAgoUTC,
      });
      localStorage.setItem("hydration_logs", JSON.stringify(allLogs));

      // getTodayLogs should still only find today's log (250ml)
      expect(getTodayLogs().length).toBe(1);
      expect(getTodayLogs()[0].amount).toBe(250);

      // getIntakeHistory should show both
      const history = getIntakeHistory(3);
      expect(history.length).toBe(3);
      // index 2 is today, index 0 is 2 days ago
      expect(history[2].intake).toBe(250);
      expect(history[0].intake).toBe(500);
      expect(history[1].intake).toBe(0);
    });
  });
});
