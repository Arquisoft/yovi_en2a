import { useTranslation } from 'react-i18next';
import playGuest from '../../../../assets/play_guest.png';
import register from '../../../../assets/register.png';
import login from '../../../../assets/login.png';

export default function AccountHelp() {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('help.account.title')}</h2>
      <p>{t('help.account.intro')}</p>

      <section>
        <h3>{t('help.account.playAsGuest')}</h3>
        <p>{t('help.account.playAsGuestText1')}</p>
        <p>{t('help.account.playAsGuestText2')}</p>
        <img src={playGuest} alt="Main menu" />
      </section>

      <section>
        <h3>{t('help.account.createAccount')}</h3>
        <p>{t('help.account.createAccountText')}</p>
        <img src={register} alt="Registration window" />
      </section>

      <section>
        <h3>{t('help.account.logIn')}</h3>
        <p>{t('help.account.logInText1')}</p>
        <img src={login} alt="Log in window" />
        <p>{t('help.account.logInText2')}</p>
      </section>

      <section>
        <h3>{t('help.account.logOut')}</h3>
        <p>{t('help.account.logOutText')}</p>
      </section>
    </div>
  );
}
