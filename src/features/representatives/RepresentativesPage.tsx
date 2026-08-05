import { useState, useEffect } from "react";
import { UserRoundPlus, Plus, Pencil, Archive, RotateCcw, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle } from "../../components/Card/Card";
import { Button } from "../../components/Button/Button";
import { Input } from "../../components/Input/Input";
import { Select } from "../../components/Select/Select";
import { Modal } from "../../components/Modal/Modal";
import { Badge } from "../../components/Badge/Badge";
import { FirebaseRepresentativeRepository } from "../../repositories/firebase/FirebaseRepresentativeRepository";
import { getSession } from "../../services/authService";
import type { Representative, RepresentativeCreate } from "../../models/representative";
import { nowISO } from "../../utils/date";
import styles from "./RepresentativesPage.module.css";

const repo = new FirebaseRepresentativeRepository();

export function RepresentativesPage() {
  const session = getSession();
  const [reps, setReps] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [officeFilter, setOfficeFilter] = useState("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RepresentativeCreate>({ name: "", office: "all", includeDraps: true, includeFirstConsult: false, includeFinanceRun: false, notes: "" });

  const load = async () => {
    try { setReps(await repo.getAll()); } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", office: "all", includeDraps: true, includeFirstConsult: false, includeFinanceRun: false, notes: "" }); setEditingId(null); setShowModal(true); };
  const openEdit = (r: Representative) => { setForm({ name: r.name, office: r.office, includeDraps: r.includeDraps, includeFirstConsult: r.includeFirstConsult, includeFinanceRun: r.includeFinanceRun, notes: r.notes || "", displayOrder: r.displayOrder }); setEditingId(r.id); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true); setMessage(null);
    try {
      const uid = session?.staffId || "unknown";
      const name = session?.name || "Unknown";
      if (editingId) { await repo.update(editingId, form, uid, name); }
      else { await repo.create(form, uid, name); }
      setShowModal(false); setMessage({ type: "success", text: editingId ? "Representative updated." : "Representative added." });
      load();
    } catch (e: any) { setMessage({ type: "error", text: "Could not save representative. Please try again." }); console.error(e); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: string) => { try { await repo.deactivate(id, session?.staffId || "unknown"); load(); } catch (e) { console.error(e); } };
  const restore = async (id: string) => { try { await repo.restore(id, session?.staffId || "unknown", session?.name || "Unknown"); load(); } catch (e) { console.error(e); } };
  const move = async (id: string, dir: 1 | -1) => {
    const r = reps.find(r => r.id === id); if (!r) return;
    const swapped = reps.find(x => x.displayOrder === r.displayOrder + dir && x.active === r.active);
    if (!swapped) return;
    try {
      await repo.update(r.id, { displayOrder: swapped.displayOrder }, session?.staffId || "", session?.name || "");
      await repo.update(swapped.id, { displayOrder: r.displayOrder }, session?.staffId || "", session?.name || "");
      load();
    } catch (e) { console.error(e); }
  };

  const filtered = reps
    .filter(r => officeFilter === "all" || r.office === officeFilter)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));
  const active = filtered.filter(r => r.active);
  const inactive = filtered.filter(r => !r.active);

  return (
    <div className={styles.page}>
      <div className={styles.header}><h1 className={styles.title}><UserRoundPlus size={24} /> Representatives</h1><Button onClick={openNew}><Plus size={14} /> Add Representative</Button></div>
      {message && <div className={message.type === "error" ? styles.errorMsg : styles.successMsg}>{message.text}</div>}
      <div className={styles.toolbar}>
        <Input label="" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
        <Select label="" value={officeFilter} onChange={e => setOfficeFilter(e.target.value)} options={[{ value: "all", label: "All Offices" }, { value: "brisbane", label: "Brisbane" }, { value: "perth", label: "Perth" }, { value: "all", label: "All-Office" }]} />
      </div>
      {loading ? <p className={styles.loading}>Loading...</p> : active.length === 0 && inactive.length === 0 ? <p className={styles.empty}>No representatives yet. Add one to get started.</p> : (
        <>
          {active.length > 0 && <Card><CardHeader><CardTitle>Active ({active.length})</CardTitle></CardHeader><div className={styles.list}>{active.map((r, i) => <RepRow key={r.id} rep={r} index={i} total={active.length} onEdit={openEdit} onDeactivate={deactivate} onMove={move} />)}</div></Card>}
          {inactive.length > 0 && <Card><CardHeader><CardTitle>Inactive ({inactive.length})</CardTitle></CardHeader><div className={styles.list}>{inactive.map(r => <RepRow key={r.id} rep={r} index={0} total={0} onEdit={openEdit} onRestore={restore} onMove={move} />)}</div></Card>}
        </>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Edit Representative" : "New Representative"} width="500px">
        <div className={styles.form}>
          <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          <Select label="Office" value={form.office} onChange={e => setForm(p => ({ ...p, office: e.target.value as any }))} options={[{ value: "brisbane", label: "Brisbane" }, { value: "perth", label: "Perth" }, { value: "all", label: "All Offices" }]} />
          <div className={styles.checkGroup}>
            <label><input type="checkbox" checked={form.includeDraps} onChange={e => setForm(p => ({ ...p, includeDraps: e.target.checked }))} /> Daily DRAPS</label>
            <label><input type="checkbox" checked={form.includeFirstConsult} onChange={e => setForm(p => ({ ...p, includeFirstConsult: e.target.checked }))} /> First Consult</label>
            <label><input type="checkbox" checked={form.includeFinanceRun} onChange={e => setForm(p => ({ ...p, includeFinanceRun: e.target.checked }))} /> Finance Run</label>
          </div>
          <Input label="Notes" value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className={styles.modalActions}><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

function RepRow({ rep, index, total, onEdit, onDeactivate, onRestore, onMove }: { rep: Representative; index: number; total: number; onEdit: (r: Representative) => void; onDeactivate?: (id: string) => void; onRestore?: (id: string) => void; onMove: (id: string, dir: 1 | -1) => void }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowInfo}><span className={styles.rowName}>{rep.name}</span><Badge>{rep.office === "all" ? "All Offices" : rep.office.charAt(0).toUpperCase() + rep.office.slice(1)}</Badge></div>
      <div className={styles.rowTags}>{rep.includeDraps && <Badge variant="default">DRAPS</Badge>}{rep.includeFirstConsult && <Badge variant="default">1st Consult</Badge>}{rep.includeFinanceRun && <Badge variant="default">Finance</Badge>}</div>
      <div className={styles.rowActions}>
        {rep.active && onDeactivate && <><Button variant="ghost" size="sm" onClick={() => onMove(rep.id, -1)} disabled={index === 0}><ChevronUp size={14} /></Button><Button variant="ghost" size="sm" onClick={() => onMove(rep.id, 1)} disabled={index === total - 1}><ChevronDown size={14} /></Button></>}
        <Button variant="ghost" size="sm" onClick={() => onEdit(rep)}><Pencil size={14} /></Button>
        {rep.active && onDeactivate ? <Button variant="ghost" size="sm" onClick={() => onDeactivate(rep.id)}><Archive size={14} /></Button> : onRestore ? <Button variant="ghost" size="sm" onClick={() => onRestore(rep.id)}><RotateCcw size={14} /></Button> : null}
      </div>
    </div>
  );
}
