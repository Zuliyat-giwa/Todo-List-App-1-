'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/providers';
import { api, Country, ShippingMethod } from '@/lib/api';
import { fromMinor, toMinor } from '@/lib/format';

interface Settings {
  info: { name?: string; supportEmail?: string; phone?: string; address?: string; announcement?: string };
  countries: (Country & { isActive: boolean })[];
  shipping: (ShippingMethod & { isActive: boolean })[];
  integrations: { mailgun: boolean; paystack: boolean; google: boolean };
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const load = () => api<Settings>('/admin/settings').then(setS).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <div className="skeleton h-64" />;
  const info = s.info;
  const badge = (on: boolean) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{on ? 'Configured' : 'Not configured'}</span>;

  return (
    <div className="space-y-10">
      <h1 className="text-4xl">Settings</h1>

      <section className="card space-y-3 p-6">
        <h2 className="text-xl">Integrations</h2>
        <ul className="space-y-2 text-sm"><li className="flex justify-between">Mailgun email {badge(s.integrations.mailgun)}</li><li className="flex justify-between">Paystack payments {badge(s.integrations.paystack)}</li><li className="flex justify-between">Google sign-in {badge(s.integrations.google)}</li></ul>
        <p className="text-xs text-ink-mute">Credentials are set as environment variables on the server and are never shown here.</p>
      </section>

      <form className="card grid gap-4 p-6 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); try { await api('/admin/settings/info', { method: 'PUT', json: { name: info.name ?? '', supportEmail: info.supportEmail ?? '', phone: info.phone || undefined, address: info.address || undefined, announcement: info.announcement || undefined } }); toast('Store information saved'); } catch (er: any) { toast(er.message, 'err'); } }}>
        <h2 className="text-xl sm:col-span-2">Store information</h2>
        {(['name', 'supportEmail', 'phone', 'address'] as const).map((k) => (
          <div key={k}><label className="label" htmlFor={`si-${k}`}>{k === 'supportEmail' ? 'Support email' : k[0].toUpperCase() + k.slice(1)}</label><input id={`si-${k}`} className="input" value={info[k] ?? ''} onChange={(e) => setS({ ...s, info: { ...info, [k]: e.target.value } })} /></div>
        ))}
        <div className="sm:col-span-2"><label className="label" htmlFor="si-ann">Announcement bar</label><input id="si-ann" className="input" value={info.announcement ?? ''} onChange={(e) => setS({ ...s, info: { ...info, announcement: e.target.value } })} /></div>
        <div><button className="btn-dark">Save</button></div>
      </form>

      <section className="card space-y-4 p-6">
        <h2 className="text-xl">Countries, currencies and tax</h2>
        <p className="text-sm text-ink-mute">The store charges in NGN. The exchange rate (1 NGN = x) is used only to display indicative prices in other currencies. Tax is added to the order at checkout.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm">
          <thead className="text-xs uppercase text-ink-mute"><tr>{['Country', 'Language', 'Currency', 'Rate', 'Tax %', 'Ships'].map((h) => <th key={h} className="p-2 text-start">{h}</th>)}<th /></tr></thead>
          <tbody>{s.countries.map((c, i) => {
            const up = (patch: Partial<typeof c>) => { const a = [...s.countries]; a[i] = { ...c, ...patch }; setS({ ...s, countries: a }); };
            return (
              <tr key={c.code} className="border-t border-ink/5">
                <td className="p-2">{c.name} ({c.code})</td>
                <td className="p-2"><select aria-label={`${c.code} language`} className="input !py-1.5" value={c.language} onChange={(e) => up({ language: e.target.value })}><option value="en">en</option><option value="ar">ar</option></select></td>
                <td className="p-2"><input aria-label={`${c.code} currency`} className="input !w-24 !py-1.5" maxLength={3} value={c.currency} onChange={(e) => up({ currency: e.target.value.toUpperCase() })} /></td>
                <td className="p-2"><input aria-label={`${c.code} rate`} type="number" step="any" min={0} className="input !w-28 !py-1.5" value={c.rateFromBase} onChange={(e) => up({ rateFromBase: Number(e.target.value) })} /></td>
                <td className="p-2"><input aria-label={`${c.code} tax`} type="number" step="0.1" min={0} max={100} className="input !w-20 !py-1.5" value={c.taxPercent} onChange={(e) => up({ taxPercent: Number(e.target.value) })} /></td>
                <td className="p-2"><input aria-label={`${c.code} active`} type="checkbox" className="accent-brand" checked={c.isActive} onChange={(e) => up({ isActive: e.target.checked })} /></td>
                <td className="p-2"><button className="text-brand underline" onClick={async () => { try { await api(`/admin/settings/countries/${c.code}`, { method: 'PUT', json: { code: c.code, name: c.name, language: c.language, currency: c.currency, rateFromBase: c.rateFromBase, taxPercent: c.taxPercent, isActive: c.isActive } }); toast(`${c.name} saved`); } catch (er: any) { toast(er.message, 'err'); } }}>Save</button></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-xl">Shipping rules</h2>
        {s.shipping.map((m, i) => {
          const up = (patch: Partial<typeof m>) => { const a = [...s.shipping]; a[i] = { ...m, ...patch }; setS({ ...s, shipping: a }); };
          return (
            <div key={m.id} className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_.6fr_.6fr_auto]">
              <div><label className="label" htmlFor={`sm-n${i}`}>Name</label><input id={`sm-n${i}`} className="input" value={m.name} onChange={(e) => up({ name: e.target.value })} /></div>
              <div><label className="label" htmlFor={`sm-p${i}`}>Price (NGN)</label><input id={`sm-p${i}`} type="number" min={0} className="input" value={fromMinor(m.priceMinor)} onChange={(e) => up({ priceMinor: toMinor(e.target.value) })} /></div>
              <div><label className="label" htmlFor={`sm-f${i}`}>Free over (NGN)</label><input id={`sm-f${i}`} type="number" min={0} className="input" value={m.freeOverMinor != null ? fromMinor(m.freeOverMinor) : ''} onChange={(e) => up({ freeOverMinor: e.target.value ? toMinor(e.target.value) : null })} /></div>
              <div><label className="label" htmlFor={`sm-a${i}`}>Min days</label><input id={`sm-a${i}`} type="number" min={0} className="input" value={m.minDays} onChange={(e) => up({ minDays: Number(e.target.value) })} /></div>
              <div><label className="label" htmlFor={`sm-b${i}`}>Max days</label><input id={`sm-b${i}`} type="number" min={0} className="input" value={m.maxDays} onChange={(e) => up({ maxDays: Number(e.target.value) })} /></div>
              <button className="btn-dark !px-5 !py-3" onClick={async () => { try { await api(`/admin/settings/shipping/${m.id}`, { method: 'PUT', json: { name: m.name, priceMinor: m.priceMinor, freeOverMinor: m.freeOverMinor, minDays: m.minDays, maxDays: m.maxDays, isActive: m.isActive } }); toast('Shipping rule saved'); } catch (er: any) { toast(er.message, 'err'); } }}>Save</button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
