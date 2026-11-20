// Every native calculator must list its sources (ROADMAP: traceability), and every source must be complete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sources, sourcesFor } from '../src/data/sources.ts';
import { tools } from '../src/data/tools.ts';

// tools rebuilt purely from their original sheet (textbook formulas, no outside data)
const ORIGINAL_ONLY = new Set(['geometry', 'prime-numbers']);

test('every native tool has at least one source besides its original sheet', () => {
  for (const t of tools.filter((x) => x.native && !ORIGINAL_ONLY.has(x.slug))) {
    assert.ok(sourcesFor(t.slug).length > 0, `${t.slug} has no sources`);
  }
});

test('sources are complete and point at existing tools', () => {
  const slugs = new Set(tools.map((t) => t.slug));
  const ids = new Set<string>();
  for (const s of sources) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`); ids.add(s.id);
    assert.ok(s.by && s.title, `${s.id}: author and title`);
    assert.match(s.read, /^\d{4}-\d{2}-\d{2}$/, `${s.id}: read date`);
    if (s.url) assert.match(s.url, /^https?:\/\//, `${s.id}: url`);
    if (s.archive) assert.match(s.archive, /^https:\/\/web\.archive\.org\/web\/\d{14}\//, `${s.id}: archive`);
    assert.ok(s.url || s.where, `${s.id}: needs a url or a bibliographic reference`);
    assert.ok(Object.keys(s.use).length > 0, `${s.id}: used by no tool`);
    for (const [slug, what] of Object.entries(s.use)) {
      assert.ok(slugs.has(slug), `${s.id}: unknown tool ${slug}`);
      assert.ok(what.length > 10, `${s.id}: say what it was used for in ${slug}`);
    }
  }
});
