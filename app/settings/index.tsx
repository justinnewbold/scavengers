import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, BottomSheet } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { useI18n } from '@/hooks/useI18n';
import { Locale } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'app_settings';

interface Settings {
  notifications: {
    huntUpdates: boolean;
    achievements: boolean;
    teamActivity: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reduceMotion: boolean;
    largeText: boolean;
  };
}

const defaultSettings: Settings = {
  notifications: {
    huntUpdates: true,
    achievements: true,
    teamActivity: true,
  },
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    largeText: false,
  },
};

export default function SettingsScreen() {
  const router = useRouter();
  const { locale, setLocale, t, availableLocales } = useI18n();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  const updateNotificationSetting = async (key: keyof Settings['notifications'], value: boolean) => {
    await Haptics.selectionAsync();
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    };
    saveSettings(newSettings);
  };

  const updateAccessibilitySetting = async (key: keyof Settings['accessibility'], value: boolean) => {
    await Haptics.selectionAsync();
    const newSettings = {
      ...settings,
      accessibility: { ...settings.accessibility, [key]: value },
    };
    saveSettings(newSettings);
  };

  const handleLanguageSelect = async (code: Locale) => {
    await Haptics.selectionAsync();
    await setLocale(code);
    setShowLanguagePicker(false);
  };

  const selectedLanguage = availableLocales.find(l => l.code === locale)?.name || 'English';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <TouchableOpacity onPress={() => setShowLanguagePicker(true)}>
            <Card style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="globe-outline" size={22} color={Colors.primary} />
                <Text style={styles.settingText}>{t('settings.language')}</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{selectedLanguage}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.textSecondary}
                />
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="compass-outline" size={22} color={Colors.primary} />
              <View>
                <Text style={styles.settingText}>{t('settings.huntUpdates')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.huntUpdatesDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.huntUpdates}
              onValueChange={(value) => updateNotificationSetting('huntUpdates', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="trophy-outline" size={22} color={Colors.warning} />
              <View>
                <Text style={styles.settingText}>{t('settings.achievements')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.achievementsDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.achievements}
              onValueChange={(value) => updateNotificationSetting('achievements', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="people-outline" size={22} color={Colors.success} />
              <View>
                <Text style={styles.settingText}>{t('settings.teamActivity')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.teamActivityDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.teamActivity}
              onValueChange={(value) => updateNotificationSetting('teamActivity', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.accessibility')}</Text>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="contrast-outline" size={22} color={Colors.text} />
              <View>
                <Text style={styles.settingText}>{t('settings.highContrast')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.highContrastDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.accessibility.highContrast}
              onValueChange={(value) => updateAccessibilitySetting('highContrast', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="pause-outline" size={22} color={Colors.text} />
              <View>
                <Text style={styles.settingText}>{t('settings.reduceMotion')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.reduceMotionDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.accessibility.reduceMotion}
              onValueChange={(value) => updateAccessibilitySetting('reduceMotion', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>

          <Card style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="text-outline" size={22} color={Colors.text} />
              <View>
                <Text style={styles.settingText}>{t('settings.largeText')}</Text>
                <Text style={styles.settingSubtext}>{t('settings.largeTextDesc')}</Text>
              </View>
            </View>
            <Switch
              value={settings.accessibility.largeText}
              onValueChange={(value) => updateAccessibilitySetting('largeText', value)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </Card>
        </View>
      </ScrollView>

      {/* Language BottomSheet */}
      <BottomSheet
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        title="Language"
        snapPoints={[0.5]}
      >
        <ScrollView>
          {availableLocales.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageOption}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <Text style={[
                styles.languageText,
                locale === lang.code && styles.languageTextSelected,
              ]}>
                {lang.name}
              </Text>
              {locale === lang.code && (
                <Ionicons name="checkmark" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: { padding: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  placeholder: { width: 32 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    minHeight: 48,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  settingText: { fontSize: FontSizes.md, color: Colors.text, fontWeight: '500' },
  settingSubtext: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  settingValue: { fontSize: FontSizes.md, color: Colors.textSecondary },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  languageText: { fontSize: FontSizes.md, color: Colors.text },
  languageTextSelected: { color: Colors.primary, fontWeight: '600' },
});
