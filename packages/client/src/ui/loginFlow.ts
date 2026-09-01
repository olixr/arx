/**
 * THE DOOR REMEMBERS — the four-view login form: 'roster' deals the
 * saved cards as faces, 'quick' asks only the password, 'signin' is the
 * classic form, 'register' adds the adventurer fields. This module owns
 * the view state and the roster shelf; auth lifecycle (tokens, the
 * in-flight attempt) stays with the shell. Moved verbatim from main.ts
 * (foundations F5.1).
 */
import { forgetAccount, loadRoster, rememberAccount, type RememberedAccount } from './loginRoster.js';
import { chosenPlate, renderRosterShelf } from './loginShelf.js';

export interface LoginEls {
  form: HTMLFormElement;
  user: HTMLInputElement;
  pass: HTMLInputElement;
  charName: HTMLInputElement;
  invite: HTMLInputElement;
  submit: HTMLButtonElement;
  toggle: HTMLButtonElement;
  other: HTMLButtonElement;
  error: HTMLElement;
  status: HTMLElement;
  rosterEl: HTMLElement;
  chosenEl: HTMLElement;
}

export interface LoginFlowOpts {
  els: LoginEls;
  isAuthReady(): boolean;
  /** The shell records the in-flight username and speaks to the wire. */
  submit(kind: 'login' | 'register', f: { user: string; pass: string; name: string; invite: string }): void;
}

export interface LoginFlow {
  /** Repaint the shelf (a card changed under it). */
  refreshRoster(): void;
  /** Write/refresh a card and repaint the shelf. */
  remember(card: RememberedAccount): void;
  /** The card behind a username, if the shelf holds one. */
  rosterCardFor(user: string | null): RememberedAccount | undefined;
}

export function initLoginFlow(o: LoginFlowOpts): LoginFlow {
  const { els } = o;
  const { form: loginForm, user: loginUser, pass: loginPass, charName: loginCharName, invite: loginInvite, submit: loginSubmit, toggle: loginToggle, other: loginOther, error: loginError, status: loginStatus, rosterEl: loginRosterEl, chosenEl: loginChosen } = els;
  let registerMode = false;
  let roster = loadRoster();
  let chosen: RememberedAccount | null = null;

  type LoginView = 'roster' | 'quick' | 'signin' | 'register';
  let loginView: LoginView = 'signin';

  function homeView(): LoginView {
    return roster.length > 0 ? 'roster' : 'signin';
  }

  function renderLoginRoster(): void {
    renderRosterShelf(loginRosterEl, roster, {
      onPick: (c) => {
        chosen = c;
        loginUser.value = c.user;
        setLoginView('quick');
      },
      onForget: (c) => {
        roster = forgetAccount(c.user);
        renderLoginRoster();
        if (roster.length === 0) setLoginView('signin');
      },
    });
  }

  function setLoginView(view: LoginView): void {
    loginView = view;
    registerMode = view === 'register';
    const shelf = view === 'roster';
    const quick = view === 'quick';
    if (!quick) chosen = null;
    loginRosterEl.classList.toggle('hidden', !shelf);
    loginChosen.classList.toggle('hidden', !quick);
    if (quick && chosen) loginChosen.replaceChildren(chosenPlate(chosen));
    loginUser.classList.toggle('hidden', shelf || quick);
    loginPass.classList.toggle('hidden', shelf);
    loginCharName.classList.toggle('hidden', !registerMode);
    loginCharName.required = registerMode;
    // The invite field is not marked required — the server decides
    // whether registration is gated (dev servers leave it open).
    loginInvite.classList.toggle('hidden', !registerMode);
    loginSubmit.classList.toggle('hidden', shelf);
    loginSubmit.textContent = registerMode ? 'Create & Enter World' : 'Enter World';
    loginToggle.textContent = registerMode
      ? 'Have an account? Sign in'
      : 'New here? Create an account';
    loginOther.classList.toggle('hidden', !shelf && !quick);
    loginOther.textContent = quick ? 'Not you? Choose another' : 'Sign in with a username';
    loginError.classList.add('hidden');
    if (quick) {
      loginPass.value = '';
      loginPass.focus();
    }
  }

  loginToggle.addEventListener('click', () => {
    setLoginView(registerMode ? homeView() : 'register');
  });

  loginOther.addEventListener('click', () => {
    if (loginView === 'quick') {
      setLoginView(homeView());
    } else {
      loginUser.value = '';
      loginPass.value = '';
      setLoginView('signin');
      loginUser.focus();
    }
  });

  renderLoginRoster();
  setLoginView(homeView());

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!o.isAuthReady() || loginView === 'roster') return;
    loginError.classList.add('hidden');
    loginStatus.textContent = registerMode ? 'Creating your adventurer…' : 'Signing in…';
    loginStatus.classList.remove('hidden');
    o.submit(registerMode ? 'register' : 'login', {
      user: loginUser.value.trim(),
      pass: loginPass.value,
      name: loginCharName.value.trim(),
      invite: loginInvite.value.trim(),
    });
  });

  return {
    refreshRoster: renderLoginRoster,
    remember: (card) => {
      roster = rememberAccount(card);
      renderLoginRoster();
    },
    rosterCardFor: (user) => roster.find((c) => c.user === user),
  };
}
