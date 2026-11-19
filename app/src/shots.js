// Fixed scenes for screenshots: ?shot=cover shows the cover alone (1920x1080),
// ?shot=editor the full studio UI, ?shot=portrait a tall cover, ?shot=square a square cover.
// Each scene mutates the live state, redraws, and leaves window.__shotReady to main.js.
export async function runShot(shot, params, state, helpers) {
  const { redraw, syncControls } = helpers;
  const setPanel = (i, photo, place, time, tag, oy = 0) => {
    if (!state.panels[i]) return;
    Object.assign(state.panels[i], { photo, place, time, tag, oy, zoom: 1, ox: 0 });
  };
  const setPanels = (photos) => {
    photos.forEach((photo, i) => {
      if (state.panels[i]) state.panels[i].photo = photo;
    });
  };
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    Object.assign(state, {
      layout: 'hero-top', grade: 'sunset', size: '1920x1080',
      title: 'VICE CITY', subtitle: 'welcome back',
      quote: 'The city never sleeps. Neither do we.', stars: 5,
    });
    // Hero panel is wide and short: pan the convertible shot down (oy -4.5) so the
    // pink car, which sits in the lower third of the photo, fills the frame.
    setPanel(0, 'convertible', 'Ocean Drive', '6:47 PM', 'Chase the sunset', -4.5);
    setPanel(1, 'coast-road', 'Leonida Keys', '5:12 PM', 'One last ride');
    setPanel(2, 'gas-station', 'Port Gellhorn', '2:03 AM', 'Fill up and vanish');
  } else if (shot === 'editor') {
    Object.assign(state, {
      layout: 'four-square', grade: 'neon', size: '1080x1080',
      title: 'NEON NIGHTS', subtitle: 'after dark',
      quote: 'Four corners, one city.', stars: 5,
    });
    setPanels(['convertible', 'neon-portrait', 'coast-road', 'gas-station']);
  } else if (shot === 'portrait') {
    document.body.classList.add('shot-cover');
    Object.assign(state, {
      layout: 'portrait-stack', grade: 'magenta', size: '1080x1350',
      title: 'VICE CITY', subtitle: 'neon nights',
      quote: 'Chase the glow.', stars: 4,
    });
    setPanel(0, 'neon-portrait', 'Vice City', '11:58 PM', 'Neon never sleeps');
    setPanel(1, 'gas-station', 'Port Gellhorn', '2:03 AM', 'Fill up and vanish');
    setPanel(2, 'convertible', 'Ocean Drive', '6:47 PM', 'One last ride');
  } else if (shot === 'square') {
    document.body.classList.add('shot-cover');
    Object.assign(state, {
      layout: 'three-panel', grade: 'gold', size: '1080x1080',
      title: 'GOLD HOUR', subtitle: 'leonida keys',
      quote: 'Golden light, fast cars.', stars: 5,
    });
    setPanel(0, 'coast-road', 'Leonida Keys', '5:12 PM', 'Chase the sunset');
    setPanel(1, 'neon-portrait', 'Vice City', '11:58 PM', 'Neon never sleeps');
    setPanel(2, 'convertible', 'Ocean Drive', '6:47 PM', 'One last ride');
  } else {
    document.body.classList.add('shot-cover');
  }
  syncControls();
  await redraw();
}
