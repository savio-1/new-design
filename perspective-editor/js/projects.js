/* Perspective — project store. Projects (the editor state as JSON, a thumbnail and a few facts for the
 * home screen) and the media files they use live in IndexedDB in this browser, so a project can be
 * closed and opened again with its video, layers and sound intact. When IndexedDB is not available
 * (some private windows) the store falls back to memory for the session. */
(function (global) {
  'use strict';

  const DB_NAME = 'perspective-projects';
  const DB_VERSION = 1;
  let dbPromise = null;
  let memory = null;   // { projects: Map, files: Map } once IndexedDB has failed

  function open() {
    if (memory) return Promise.reject(new Error('memory'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('IndexedDB unavailable'));
      let req;
      try { req = global.indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('files')) {
          const files = db.createObjectStore('files', { keyPath: 'key' });
          files.createIndex('project', 'project', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB failed to open'));
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    dbPromise.catch(() => { dbPromise = null; useMemory(); });
    return dbPromise;
  }
  function useMemory() {
    if (!memory) memory = { projects: new Map(), files: new Map() };
    return memory;
  }
  /* Run `fn(store)` in a transaction and resolve with the request's result once it commits. */
  function run(storeName, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let out;
      try { out = fn(store); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
      tx.onerror = () => reject(tx.error || new Error('transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
    }));
  }
  const collect = (req) => new Promise((resolve, reject) => {
    const out = [];
    req.onsuccess = () => { const cur = req.result; if (cur) { out.push(cur.value); cur.continue(); } else resolve(out); };
    req.onerror = () => reject(req.error);
  });

  const Projects = {
    /* Every project, newest first, without the (possibly large) state JSON. */
    async list() {
      let rows;
      try {
        rows = await open().then((db) => new Promise((resolve, reject) => {
          const tx = db.transaction('projects', 'readonly');
          collect(tx.objectStore('projects').openCursor()).then(resolve, reject);
        }));
      } catch (e) { rows = Array.from(useMemory().projects.values()); }
      return rows.map((r) => Object.assign({}, r, { data: undefined })).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    },
    async get(id) {
      try { return await run('projects', 'readonly', (s) => s.get(id)); }
      catch (e) { return useMemory().projects.get(id) || null; }
    },
    async put(rec) {
      try { await run('projects', 'readwrite', (s) => s.put(rec)); }
      catch (e) { useMemory().projects.set(rec.id, rec); }
      return rec;
    },
    async remove(id) {
      await Projects.deleteFiles(id);
      try { await run('projects', 'readwrite', (s) => s.delete(id)); }
      catch (e) { useMemory().projects.delete(id); }
    },
    /* Files are keyed "<project id>/<asset id>" and carry { project, name, type, blob }. */
    async putFile(file) {
      try { await run('files', 'readwrite', (s) => s.put(file)); }
      catch (e) { useMemory().files.set(file.key, file); }
    },
    async getFile(key) {
      try { return await run('files', 'readonly', (s) => s.get(key)); }
      catch (e) { return useMemory().files.get(key) || null; }
    },
    async deleteFile(key) {
      try { await run('files', 'readwrite', (s) => s.delete(key)); }
      catch (e) { useMemory().files.delete(key); }
    },
    async filesOf(projectId) {
      try {
        return await open().then((db) => new Promise((resolve, reject) => {
          const tx = db.transaction('files', 'readonly');
          collect(tx.objectStore('files').index('project').openCursor(IDBKeyRange.only(projectId))).then(resolve, reject);
        }));
      } catch (e) { return Array.from(useMemory().files.values()).filter((f) => f.project === projectId); }
    },
    async fileKeys(projectId) { return (await Projects.filesOf(projectId)).map((f) => f.key); },
    async deleteFiles(projectId) {
      const files = await Projects.filesOf(projectId);
      for (const f of files) await Projects.deleteFile(f.key);
    },
    /* Copy every file of one project to another (for duplicating a project). */
    async copyFiles(fromId, toId) {
      const files = await Projects.filesOf(fromId);
      for (const f of files) {
        const assetId = f.key.slice(fromId.length + 1);
        await Projects.putFile(Object.assign({}, f, { key: `${toId}/${assetId}`, project: toId }));
      }
    },
    /* Rough total of the stored media for a project, in bytes. */
    async bytesOf(projectId) {
      const files = await Projects.filesOf(projectId);
      return files.reduce((a, f) => a + ((f.blob && f.blob.size) || 0), 0);
    },
    usingMemory() { return !!memory; },
    newId() { return `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; },
  };

  global.Projects = Projects;
})(window);
