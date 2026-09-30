/**
 * Build-time prerender entry (see scripts/prerender.mjs). Renders a route to static
 * HTML, waiting for lazy chunks (the Story page) so the output is complete.
 */
import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { App } from './App';
import { site } from './content';
import { storyMeta } from './story/storyContent';
import { setServerPath } from './router/router';

/** Routes to prerender, with their document titles and meta descriptions. */
export const routes = [
  // The Portfolio keeps index.html's own description / og:description.
  { path: '/', route: 'portfolio', files: ['index.html'], title: site.title, description: undefined },
  // story.html serves /story on most static hosts (and vite preview); story/index.html serves /story/.
  {
    path: '/story',
    route: 'story',
    files: ['story.html', 'story/index.html'],
    title: storyMeta.title,
    description: storyMeta.description,
  },
] as const;

export async function render(path: string): Promise<string> {
  setServerPath(path);
  const { prelude } = await prerender(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  return new Response(prelude).text();
}
