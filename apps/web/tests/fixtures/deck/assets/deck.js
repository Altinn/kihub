function show() {
  document.getElementById('slide').textContent = 'Slide ' + (location.hash.slice(1) || '1');
}
addEventListener('hashchange', show);
show();
