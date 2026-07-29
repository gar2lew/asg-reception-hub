import { useState } from 'react';
import { ExternalLink, Plus, Pencil, Search, Star, Archive, RotateCcw, Pin, PinOff } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/Card/Card';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Modal } from '../../components/Modal/Modal';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { getSession } from '../../services/authService';
import { QuickLinkRepository } from '../../repositories/localStorage/QuickLinkRepository';
import { QuickLinkGroupRepository } from '../../repositories/localStorage/QuickLinkGroupRepository';
import { isValidUrl, safeUrl } from '../../utils/urlValidation';
import { nowISO } from '../../utils/date';
import type { QuickLink, LinkOpenBehaviour, LinkScope } from '../../models';
import styles from './QuickLinksPage.module.css';

const linkRepo = new QuickLinkRepository();
const groupRepo = new QuickLinkGroupRepository();

export function QuickLinksPage() {
  const session = getSession();
  const [, refresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [modal, setModal] = useState<{ type: string; id?: string } | null>(null);
  const userId = session?.staffId || '';
  const forceRefresh = () => refresh(n => n + 1); const close = () => setModal(null);

  // Shared + personal links
  const allLinks = linkRepo.getAll().filter(l => !l.archived);
  const sharedLinks = allLinks.filter(l => l.scope !== 'personal');
  const personalLinks = allLinks.filter(l => l.scope === 'personal' && l.ownerUid === userId);
  const visibleLinks = filterScope ? allLinks.filter(l => l.scope === filterScope) : allLinks;
  const filtered = visibleLinks.filter(l => !search || l.title.toLowerCase().includes(search.toLowerCase()) || (l.description || '').toLowerCase().includes(search.toLowerCase()));

  // Link form
  const [form, setForm] = useState({ title: '', url: '', description: '', group: 'daily_systems', scope: 'personal' as LinkScope, openBehaviour: 'new-tab' as LinkOpenBehaviour });
  const [urlError, setUrlError] = useState('');
  const saveLink = () => {
    setUrlError('');
    if (!form.title.trim() || !form.url.trim()) return;
    if (!isValidUrl(form.url.trim())) { setUrlError('Invalid URL. Only https, http, mailto, tel allowed.'); return; }
    if (modal?.id) {
      linkRepo.update(modal.id, { title: form.title.trim(), url: form.url.trim(), description: form.description || undefined, group: form.group, openBehaviour: form.openBehaviour });
    } else {
      linkRepo.create({ id: crypto.randomUUID(), title: form.title.trim(), url: form.url.trim(), description: form.description || undefined, group: form.group, scope: form.scope, office: form.scope === 'organisation' ? 'all' : undefined, ownerUid: form.scope === 'personal' ? userId : 'admin-001', openBehaviour: form.openBehaviour, pinned: false, order: 0, enabled: true, createdAt: nowISO(), updatedAt: nowISO() });
    }
    close(); forceRefresh();
  };
  const editLink = (l: QuickLink) => { setForm({ title: l.title, url: l.url, description: l.description || '', group: l.group, scope: l.scope, openBehaviour: l.openBehaviour }); setUrlError(''); setModal({ type: 'link', id: l.id }); };
  const togglePin = (l: QuickLink) => { linkRepo.update(l.id, { pinned: !l.pinned }); forceRefresh(); };
  const archiveLink = (id: string) => { linkRepo.update(id, { archived: true, archivedAt: nowISO() }); forceRefresh(); };
  const deleteLink = (id: string) => { linkRepo.delete(id); forceRefresh(); };
  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.pageTitle}>Quick Links</h1>
        <Button size="sm" onClick={() => { setForm({ title: '', url: '', description: '', group: 'daily_systems', scope: 'personal', openBehaviour: 'new-tab' }); setUrlError(''); setModal({ type: 'link' }); }}><Plus size={14} /> Add Link</Button>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}><Search size={14} /><input className={styles.searchInput} placeholder="Search links..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className={styles.filterSelect} value={filterScope} onChange={e => setFilterScope(e.target.value)}>
          <option value="">All Links</option><option value="organisation">Organisation</option><option value="personal">Personal</option>
        </select>
      </div>
      {filtered.filter(l => l.pinned).length > 0 && (
        <Card><CardHeader><CardTitle><Star size={14} /> Favourites</CardTitle></CardHeader>
          <div className={styles.list}>{filtered.filter(l => l.pinned).map(l => (
            <div key={l.id} className={styles.linkItem}>
              <div className={styles.linkContent}><a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer" className={styles.linkTitle}>{l.title}</a>
                <div className={styles.linkMeta}>{l.scope !== 'personal' && <Badge>{l.scope}</Badge>}{l.pinned && <Pin size={11} />}</div>
              </div>
              <div className={styles.linkActions}>
                <button className={styles.iconBtn} onClick={() => togglePin(l)}><PinOff size={14} /></button>
                {l.scope === 'personal' && <button className={styles.iconBtn} onClick={() => editLink(l)}><Pencil size={14} /></button>}
                {l.scope === 'personal' && <button className={styles.iconBtn} onClick={() => archiveLink(l.id)}><Archive size={14} /></button>}
              </div>
            </div>
          ))}</div>
        </Card>
      )}
      <div className={styles.grid}>
        {['daily_systems','communication','documents','ordering','staff_resources','personal'].map(groupKey => {
          const links = filtered.filter(l => l.group === groupKey);
          if (links.length === 0 && groupKey !== 'personal') return null;
          if (groupKey === 'personal') {
            const pers = links.filter(l => l.scope === 'personal');
            if (pers.length === 0 && search) return null;
            return <Card key="personal"><CardHeader><CardTitle><User size={14} /> My Links</CardTitle></CardHeader>
              <div className={styles.list}>{(pers.length > 0 ? pers : personalLinks.filter(l => !search || l.title.toLowerCase().includes(search.toLowerCase()))).map(l => (
                <div key={l.id} className={styles.linkItem}>
                  <div className={styles.linkContent}><a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer" className={styles.linkTitle}>{l.title}<ExternalLink size={12} /></a>
                    {l.description && <span className={styles.linkDesc}>{l.description}</span>}</div>
                  <div className={styles.linkActions}>
                    <button className={styles.iconBtn} onClick={() => togglePin(l)}>{l.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                    <button className={styles.iconBtn} onClick={() => editLink(l)}><Pencil size={14} /></button>
                    <button className={styles.iconBtn} onClick={() => archiveLink(l.id)}><Archive size={14} /></button>
                  </div>
                </div>
              ))}{pers.length === 0 && personalLinks.length === 0 && <p className={styles.empty}>No personal links. Click Add Link to create one.</p>}</div>
            </Card>;
          }
          const groupLabel = ({ daily_systems: 'Daily Systems', communication: 'Communication', documents: 'Documents', ordering: 'Ordering', staff_resources: 'Staff Resources' } as Record<string, string>)[groupKey] || groupKey;
          return <Card key={groupKey}><CardHeader><CardTitle>{groupLabel}</CardTitle></CardHeader>
            <div className={styles.list}>{links.filter(l => l.scope !== 'personal').map(l => (
              <div key={l.id} className={styles.linkItem}>
                <div className={styles.linkContent}><a href={safeUrl(l.url)} target="_blank" rel="noopener noreferrer" className={styles.linkTitle}>{l.title}<ExternalLink size={12} /></a>
                  <div className={styles.linkMeta}>{l.scope !== 'organisation' && <Badge>{l.scope}</Badge>}{l.pinned && <Pin size={11} />}</div>
                </div>
                <div className={styles.linkActions}>
                  <button className={styles.iconBtn} onClick={() => togglePin(l)}>{l.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                </div>
              </div>
            ))}</div>
          </Card>;
        })}
      </div>
      <Modal open={modal?.type === 'link'} onClose={close} title={modal?.id ? 'Edit Link' : 'New Link'}>
        <div className={styles.modalForm}>
          <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <Input label="URL" value={form.url} onChange={e => { setForm(p => ({ ...p, url: e.target.value })); setUrlError(''); }} placeholder="https://..." required />
          {urlError && <p className={styles.error}>{urlError}</p>}
          <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <Select label="Group" value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} options={[{ value: 'daily_systems', label: 'Daily Systems' }, { value: 'communication', label: 'Communication' }, { value: 'documents', label: 'Documents' }, { value: 'ordering', label: 'Ordering' }, { value: 'staff_resources', label: 'Staff Resources' }]} />
          <Select label="Scope" value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value as LinkScope }))} options={[{ value: 'personal', label: 'Personal' }, { value: 'organisation', label: 'Organisation' }]} />
          <Select label="Open in" value={form.openBehaviour} onChange={e => setForm(p => ({ ...p, openBehaviour: e.target.value as LinkOpenBehaviour }))} options={[{ value: 'new-tab', label: 'New Tab' }, { value: 'same-tab', label: 'Same Tab' }]} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={saveLink}>{modal?.id ? 'Save' : 'Add'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
function User(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }

