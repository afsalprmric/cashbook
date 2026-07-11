import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './db/database'
import { GoogleSyncService } from './services/googleSync'

// Hook into Dexie's observable to auto-sync on any DB change.
// Dexie.Observable fires on all C/U/D changes, so we debounce sync 5s after last change.
db.use({
  stack: 'dbcore',
  name: 'AutoSyncMiddleware',
  create(downlevelDatabase) {
    return {
      ...downlevelDatabase,
      table(tableName) {
        const downlevelTable = downlevelDatabase.table(tableName);
        return {
          ...downlevelTable,
          mutate(req) {
            return downlevelTable.mutate(req).then(res => {
              GoogleSyncService.scheduleAutoSync();
              return res;
            });
          }
        };
      }
    };
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
