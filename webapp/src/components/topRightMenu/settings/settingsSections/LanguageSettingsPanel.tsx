import React from 'react';
import { useTranslation } from 'react-i18next';
import baseStyles from './SettingsSection.module.css';
import styles from './LanguageSettings.module.css';
import flagEn from '../../../../assets/flag_en.svg';
import flagEs from '../../../../assets/flag_es.svg';

const LANGUAGES = [
  { code: 'en', nativeName: 'English', subtitleKey: 'settings.language.en', flag: flagEn },
  { code: 'es', nativeName: 'Español', subtitleKey: 'settings.language.es', flag: flagEs },
] as const;

const LanguageSettingsPanel: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${baseStyles.tabPanel} ${styles.langPanel}`}>
      <h3>{t('settings.language.selectLanguage')}</h3>
      <div className={styles.langList}>
        {LANGUAGES.map(({ code, nativeName, subtitleKey, flag }) => {
          const isActive = i18n.language === code;
          return (
            <button
              key={code}
              className={`${styles.langCard} ${isActive ? styles.langCardActive : ''}`}
              onClick={() => i18n.changeLanguage(code)}
              aria-pressed={isActive}
            >
              <img src={flag} alt={nativeName} className={styles.flag} />
              <div className={styles.langInfo}>
                <span className={styles.langName}>{nativeName}</span>
                <span className={styles.langSubtitle}>{t(subtitleKey)}</span>
              </div>
              {isActive && <span className={styles.activeDot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSettingsPanel;
