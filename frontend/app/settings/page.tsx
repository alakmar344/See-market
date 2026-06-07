'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/providers';
import type { AiTone, Theme } from '@/lib/api';

export default function SettingsPage() {
  const { theme, setTheme, aiSettings, updateAiSettings, userId } = useTheme();
  const [tone, setTone] = useState<AiTone>('professional');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (aiSettings) {
      setTone(aiSettings.tone);
      setCaseSensitive(aiSettings.caseSensitive);
    }
  }, [aiSettings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      await updateAiSettings({
        tone,
        caseSensitive,
        theme,
        user_id: userId,
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <section className="panel max-w-2xl space-y-6 p-5">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">Customize your AI experience and interface preferences</p>
      </div>

      {/* Theme Settings */}
      <div className="space-y-3 border-t border-white/10 pt-6">
        <h3 className="font-semibold">Theme</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 transition ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-500/10 text-slate-100'
                : 'border-white/10 bg-slate-900/30 text-slate-400 hover:border-white/20'
            }`}
          >
            <div className="font-medium">🌙 Dark</div>
            <div className="text-xs">Dark mode</div>
          </button>
          <button
            onClick={() => handleThemeChange('white')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 transition ${
              theme === 'white'
                ? 'border-indigo-500 bg-indigo-500/10 text-slate-900'
                : 'border-white/10 bg-white/30 text-slate-600 hover:border-white/20'
            }`}
          >
            <div className="font-medium">☀️ White</div>
            <div className="text-xs">Light mode</div>
          </button>
        </div>
      </div>

      {/* AI Tone Settings */}
      <div className="space-y-3 border-t border-white/10 pt-6">
        <h3 className="font-semibold">AI Response Tone</h3>
        <p className="text-sm text-slate-400">Choose how the AI should communicate market analysis</p>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as AiTone)}
          className="w-full"
        >
          <option value="professional">Professional - Formal, precise terminology</option>
          <option value="casual">Casual - Friendly, accessible language</option>
          <option value="leisure">Leisure - Relaxed, conversational insights</option>
        </select>
      </div>

      {/* Case Sensitivity Settings */}
      <div className="space-y-3 border-t border-white/10 pt-6">
        <h3 className="font-semibold">AI Precision</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
            className="h-4 w-4 rounded border-white/15 bg-slate-950/70"
          />
          <span className="text-sm">
            <div className="font-medium">Case-Sensitive Analysis</div>
            <div className="text-slate-400">
              {caseSensitive
                ? 'Precise, case-sensitive technical references'
                : 'Flexible, natural language without strict case sensitivity'}
            </div>
          </span>
        </label>
      </div>

      {/* Save Button */}
      <div className="space-y-3 border-t border-white/10 pt-6">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {message && (
          <p className={`text-sm ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded border border-white/10 bg-slate-900/30 p-3 text-sm text-slate-300">
        <p>
          <strong>AI Settings:</strong> Your preferences affect how the AI analyzes and presents market data. These
          settings are stored securely on the backend.
        </p>
      </div>
    </section>
  );
}
