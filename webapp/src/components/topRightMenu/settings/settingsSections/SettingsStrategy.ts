// SettingsStrategy.ts
import React from 'react';

export interface SettingsSection {
  id: string;
  label: string;
  render: () => React.ReactNode;
}