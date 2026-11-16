import assert from 'node:assert/strict';
import test from 'node:test';
import { matchRoute, navigate, resolveInternalDestination } from '../apps/web/src/shared/router.ts';

test('matches a static route and tolerates trailing slash and query string', () => {
  assert.equal(matchRoute('/faq/?from=footer')?.route.name, 'faq');
  assert.equal(matchRoute('/')?.route.name, 'home');
});

test('matches route parameters and safely decodes them', () => {
  assert.deepEqual(matchRoute('/admin/orders/abc-123')?.params, { id: 'abc-123' });
  assert.equal(matchRoute('/admin/orders/with%2Fslash'), null);
});

test('unknown paths do not match a route', () => {
  assert.equal(matchRoute('/page-that-does-not-exist'), null);
});

test('internal destination resolution rejects external and unsafe URLs', () => {
  assert.equal(resolveInternalDestination('/faq', 'https://shop.example/about'), '/faq');
  assert.equal(resolveInternalDestination('//outside.example/faq', 'https://shop.example/'), null);
  assert.equal(
    resolveInternalDestination('https://outside.example/faq', 'https://shop.example/'),
    null
  );
  assert.equal(resolveInternalDestination('javascript:alert(1)', 'https://shop.example/'), null);
});

test('navigate blocks external navigation without touching browser history', () => {
  const calls = [];
  const browser = {
    location: {
      href: 'https://shop.example/about',
      origin: 'https://shop.example',
      pathname: '/about',
      search: '',
      hash: ''
    },
    history: {
      pushState: (...args) => calls.push(['push', ...args]),
      replaceState: (...args) => calls.push(['replace', ...args])
    },
    scrollTo: () => calls.push(['scroll'])
  };

  assert.equal(navigate('https://outside.example/', {}, browser), false);
  assert.deepEqual(calls, []);
});

test('navigate updates same-site history', () => {
  const calls = [];
  const location = {
    href: 'https://shop.example/about',
    origin: 'https://shop.example',
    pathname: '/about',
    search: '',
    hash: ''
  };
  const browser = {
    location,
    history: {
      pushState: (_state, _title, path) => {
        calls.push(['push', path]);
        Object.assign(location, {
          href: `https://shop.example${path}`,
          pathname: new URL(path, location.href).pathname,
          search: new URL(path, location.href).search,
          hash: new URL(path, location.href).hash
        });
      },
      replaceState: (_state, _title, path) => calls.push(['replace', path])
    },
    scrollTo: () => calls.push(['scroll'])
  };

  assert.equal(navigate('/faq', {}, browser), true);
  assert.deepEqual(calls[0], ['push', '/faq']);
  assert.equal(location.pathname, '/faq');
});
