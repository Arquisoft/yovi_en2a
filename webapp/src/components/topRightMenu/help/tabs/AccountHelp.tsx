import playGuest from '../../../../assets/play_guest.png';
import register from '../../../../assets/register.png';
import login from '../../../../assets/login.png';

export default function AccountHelp() {
  return (
    <div>
      <h2>Account</h2>
      <p> You can play Game Y as a guest or with a registered account. </p>

      <section>
        <h3>Play as Guest</h3>
        <p> Play a game immediately without creating an account. </p>
        <p> Your matches won't be saved and you won't appear in the rankings.</p>

        <img src={playGuest} alt="Main menu" />
      </section>

      <section>
        <h3>Create an account</h3>
        <p>
          Register with your email to get a persistent profile. 
          Once registered, all your wins, losses, and best times will be recorded.
        </p>
        <img src={register} alt="Registration window" />
      </section>

      <section>
        <h3>Log in</h3>
        <p>Log in with your email and password to access your full profile. </p>
        <img src={login} alt="Log in window" />
        <p> Your match history, stats, and ranking position are all tied to your account.</p>
      </section>

      <section>
        <h3>Log out</h3>
        <p>
          You can log out at any time from the user menu in the top right corner.
        </p>
      </section>
    </div>
  );
}