// =====================================================================
// auth_pages.js — render + handlers das telas de auth (signup, login,
// esqueci/reseto senha, logout).
// =====================================================================

import { renderLayout } from './layout.js';
import {
  signupUser,
  loginUser,
  destroySession,
  validateSignupInput,
  startPasswordReset,
  finishPasswordReset,
  consumePasswordResetToken,
  clearSessionCookieString,
} from './auth.js';
import {
  htmlResponse,
  redirect,
  readForm,
  escapeAttr,
} from './utils.js';

// ---------- helpers ----------

function flashHtml(kind, msg) {
  if (!msg) return '';
  return `<div class="flash flash-${kind}">${msg}</div>`;
}

function safeNextParam(url) {
  const raw = url.searchParams.get('next') || '';
  // Apenas paths internos
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '';
}

// ---------- /cadastro ----------

export async function renderSignupPage(env, request, opts = {}) {
  const { error, values = {} } = opts;
  const url = new URL(request.url);
  const next = safeNextParam(url);
  const content = `
    <div class="page-wrap page-wrap--narrow">
      <h1>Criar conta</h1>
      <p class="lead">Acesse seus cursos com a Jessica.</p>
      <div class="auth-card">
        ${flashHtml('error', error)}
        <form method="POST" action="/cadastro${next ? `?next=${encodeURIComponent(next)}` : ''}">
          <label>Nome completo
            <input type="text" name="nome" value="${escapeAttr(values.nome || '')}" required minlength="2" autocomplete="name">
          </label>
          <label>E-mail
            <input type="email" name="email" value="${escapeAttr(values.email || '')}" required autocomplete="email">
          </label>
          <label>Telefone (opcional)
            <input type="tel" name="telefone" value="${escapeAttr(values.telefone || '')}" autocomplete="tel">
          </label>
          <label>Senha
            <input type="password" name="senha" required minlength="8" autocomplete="new-password">
          </label>
          <button type="submit" class="btn btn-primary" style="margin-top:18px;width:100%;justify-content:center;">Criar conta</button>
        </form>
        <p class="alt">Já tem conta? <a href="/login${next ? `?next=${encodeURIComponent(next)}` : ''}">Entrar</a></p>
      </div>
    </div>
  `;
  return htmlResponse(
    renderLayout({
      title: 'Criar conta — Jessica Costa PSI',
      content,
      currentPath: '/cadastro',
      noindex: true,
    }),
  );
}

export async function handleSignupSubmit(env, request) {
  const url = new URL(request.url);
  const next = safeNextParam(url) || '/aluno';
  const body = await readForm(request);
  const values = {
    nome: (body.nome || '').toString(),
    email: (body.email || '').toString(),
    telefone: (body.telefone || '').toString(),
    senha: (body.senha || '').toString(),
  };
  const validateErr = validateSignupInput(values);
  if (validateErr) {
    return renderSignupPage(env, request, { error: validateErr, values });
  }
  const result = await signupUser(env, request, values);
  if (result.error) {
    return renderSignupPage(env, request, { error: result.error, values });
  }
  return redirect(next, 303, { 'set-cookie': result.session.cookie });
}

// ---------- /login ----------

export async function renderLoginPage(env, request, opts = {}) {
  const { error, values = {} } = opts;
  const url = new URL(request.url);
  const next = safeNextParam(url);
  const content = `
    <div class="page-wrap page-wrap--narrow">
      <h1>Entrar</h1>
      <p class="lead">Acesse seus cursos.</p>
      <div class="auth-card">
        ${flashHtml('error', error)}
        <form method="POST" action="/login${next ? `?next=${encodeURIComponent(next)}` : ''}">
          <label>E-mail
            <input type="email" name="email" value="${escapeAttr(values.email || '')}" required autocomplete="email">
          </label>
          <label>Senha
            <input type="password" name="senha" required autocomplete="current-password">
          </label>
          <button type="submit" class="btn btn-primary" style="margin-top:18px;width:100%;justify-content:center;">Entrar</button>
        </form>
        <p class="alt"><a href="/senha/esqueci">Esqueci minha senha</a></p>
        <p class="alt">Não tem conta? <a href="/cadastro${next ? `?next=${encodeURIComponent(next)}` : ''}">Criar conta</a></p>
      </div>
    </div>
  `;
  return htmlResponse(
    renderLayout({
      title: 'Entrar — Jessica Costa PSI',
      content,
      currentPath: '/login',
      noindex: true,
    }),
  );
}

export async function handleLoginSubmit(env, request) {
  const url = new URL(request.url);
  const next = safeNextParam(url) || '/aluno';
  const body = await readForm(request);
  const values = {
    email: (body.email || '').toString(),
    senha: (body.senha || '').toString(),
  };
  const result = await loginUser(env, request, values);
  if (result.error) {
    return renderLoginPage(env, request, { error: result.error, values });
  }
  return redirect(next, 303, { 'set-cookie': result.session.cookie });
}

// ---------- /logout ----------

export async function handleLogout(env, request, currentSession) {
  if (currentSession) {
    await destroySession(env, currentSession.id);
  }
  return redirect('/', 303, { 'set-cookie': clearSessionCookieString() });
}

// ---------- /senha/esqueci ----------

export async function renderForgotPage(env, request, opts = {}) {
  const { ok, values = {} } = opts;
  const content = `
    <div class="page-wrap page-wrap--narrow">
      <h1>Esqueci minha senha</h1>
      <p class="lead">Vamos enviar um link de redefinição para o seu e-mail.</p>
      <div class="auth-card">
        ${ok ? flashHtml('ok', 'Se o e-mail estiver cadastrado, você receberá instruções em instantes.') : ''}
        <form method="POST" action="/senha/esqueci">
          <label>E-mail
            <input type="email" name="email" value="${escapeAttr(values.email || '')}" required autocomplete="email">
          </label>
          <button type="submit" class="btn btn-primary" style="margin-top:18px;width:100%;justify-content:center;">Enviar link</button>
        </form>
        <p class="alt"><a href="/login">Voltar para o login</a></p>
      </div>
    </div>
  `;
  return htmlResponse(
    renderLayout({
      title: 'Esqueci minha senha — Jessica Costa PSI',
      content,
      currentPath: '/senha/esqueci',
      noindex: true,
    }),
  );
}

export async function handleForgotSubmit(env, request) {
  const body = await readForm(request);
  const email = (body.email || '').toString();
  const base = env.SITE_ORIGIN || new URL(request.url).origin;
  await startPasswordReset(env, email, base);
  return renderForgotPage(env, request, { ok: true, values: { email } });
}

// ---------- /senha/resetar?token=... ----------

export async function renderResetPage(env, request, opts = {}) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const { error, ok } = opts;
  let body;
  if (!token) {
    body = `<div class="auth-card">${flashHtml('error', 'Token ausente.')}<p><a href="/senha/esqueci">Solicitar novo link</a></p></div>`;
  } else if (ok) {
    body = `<div class="auth-card">${flashHtml('ok', 'Senha redefinida! Você já pode entrar.')}<p style="text-align:center;"><a class="btn btn-primary" href="/login">Entrar</a></p></div>`;
  } else {
    // Verifica se o token ainda existe (sem consumir)
    const userId = await consumePasswordResetTokenPeek(env, token);
    if (!userId) {
      body = `<div class="auth-card">${flashHtml('error', 'Token inválido ou expirado.')}<p><a href="/senha/esqueci">Solicitar novo link</a></p></div>`;
    } else {
      body = `
      <div class="auth-card">
        ${flashHtml('error', error)}
        <form method="POST" action="/senha/resetar?token=${encodeURIComponent(token)}">
          <label>Nova senha
            <input type="password" name="senha" required minlength="8" autocomplete="new-password">
          </label>
          <button type="submit" class="btn btn-primary" style="margin-top:18px;width:100%;justify-content:center;">Salvar nova senha</button>
        </form>
      </div>`;
    }
  }
  const content = `
    <div class="page-wrap page-wrap--narrow">
      <h1>Redefinir senha</h1>
      ${body}
    </div>
  `;
  return htmlResponse(
    renderLayout({
      title: 'Redefinir senha — Jessica Costa PSI',
      content,
      currentPath: '/senha/resetar',
      noindex: true,
    }),
  );
}

/** Peek: verifica existência sem consumir. */
async function consumePasswordResetTokenPeek(env, token) {
  return await env.KV.get(`rst:${token}`);
}

export async function handleResetSubmit(env, request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const body = await readForm(request);
  const senha = (body.senha || '').toString();
  const result = await finishPasswordReset(env, token, senha);
  if (result.error) {
    return renderResetPage(env, request, { error: result.error });
  }
  return renderResetPage(env, request, { ok: true });
}
