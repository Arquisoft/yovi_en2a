import { useTranslation } from 'react-i18next';

export default function MainMenuHelp() {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('help.mainMenu.title')}</h2>
      <p>{t('help.mainMenu.welcome')}</p>

      <section>
        <h3>{t('help.mainMenu.whatIsGameY')}</h3>
        <p>{t('help.mainMenu.whatIsGameYText')}</p>
      </section>

      <section>
        <h3>{t('help.mainMenu.gettingStarted')}</h3>
        <ul>
          <li>{t('help.mainMenu.gettingStartedItem1')}</li>
          <li>{t('help.mainMenu.gettingStartedItem2')}</li>
          <li>{t('help.mainMenu.gettingStartedItem3')}</li>
        </ul>
        <p>{t('help.mainMenu.moreInfo')}</p>
      </section>
    </div>
  );
}
