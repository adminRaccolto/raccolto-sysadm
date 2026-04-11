import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { http } from '../../api/http';
import EmptyState from '../../components/EmptyState';
import Feedback from '../../components/Feedback';
import LoadingBlock from '../../components/LoadingBlock';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import SystemNav from '../../components/SystemNav';
import BackButton from '../../components/BackButton';
import type { Banco, ContaBancaria, TipoContaBancaria } from '../../types/api';

const TIPOS: { value: TipoContaBancaria; label: string }[] = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'CAIXA', label: 'Caixa' },
  { value: 'APLICACAO', label: 'Aplicação' },
  { value: 'TRANSITORIA', label: 'Transitória' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'OUTRA', label: 'Outra' },
];

const TIPO_LABELS: Record<TipoContaBancaria, string> = {
  CORRENTE: 'Corrente',
  POUPANCA: 'Poupança',
  CAIXA: 'Caixa',
  APLICACAO: 'Aplicação',
  TRANSITORIA: 'Transitória',
  INVESTIMENTO: 'Investimento',
  OUTRA: 'Outra',
};

const initialForm = {
  nome: '',
  bancoId: '',
  banco: '',
  agencia: '',
  numeroConta: '',
  chavePix: '',
  tipo: 'CORRENTE' as TipoContaBancaria,
  saldoInicial: '0',
  incluiFluxoCaixa: true,
  ativo: true,
};

function apiError(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    return Array.isArray(msg) ? msg.join(' | ') : msg || fallback;
  }
  return fallback;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ContasBancariasPage() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [resContas, resBancos] = await Promise.all([
        http.get<ContaBancaria[]>('/financeiro/contas-bancarias'),
        http.get<Banco[]>('/bancos'),
      ]);
      setContas(resContas.data);
      setBancos(resBancos.data.filter((b) => b.ativo));
    } catch (err) {
      setError(apiError(err, 'Falha ao carregar dados.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openNew() {
    setForm(initialForm);
    setEditingId(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: ContaBancaria) {
    setForm({
      nome: c.nome,
      bancoId: c.bancoId ?? '',
      banco: c.banco ?? '',
      agencia: c.agencia ?? '',
      numeroConta: c.numeroConta ?? '',
      chavePix: c.chavePix ?? '',
      tipo: c.tipo,
      saldoInicial: String(c.saldoInicial),
      incluiFluxoCaixa: c.incluiFluxoCaixa,
      ativo: c.ativo,
    });
    setEditingId(c.id);
    setError(null);
    setOpen(true);
  }

  function closeModal() { if (saving) return; setOpen(false); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      bancoId: form.bancoId || null,
      banco: form.banco || null,
      agencia: form.agencia || null,
      numeroConta: form.numeroConta || null,
      chavePix: form.chavePix || null,
      saldoInicial: parseFloat(form.saldoInicial) || 0,
    };
    try {
      if (editingId) {
        await http.put(`/financeiro/contas-bancarias/${editingId}`, payload);
        setSuccess('Conta atualizada.');
      } else {
        await http.post('/financeiro/contas-bancarias', payload);
        setSuccess('Conta cadastrada.');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao salvar conta.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: ContaBancaria) {
    if (!confirm(`Excluir conta "${c.nome}"?`)) return;
    try {
      await http.delete(`/financeiro/contas-bancarias/${c.id}`);
      setSuccess('Conta excluída.');
      await load();
    } catch (err) {
      setError(apiError(err, 'Falha ao excluir conta.'));
    }
  }

  const f = form;

  return (
    <div className="page-stack page-stack--compact">
      <PageHeader
        title="Contas Bancárias"
        subtitle="Contas da empresa usadas em movimentações financeiras e fluxo de caixa."
        actions={<BackButton fallbackPath="/sistema" />}
      />
      <SystemNav />
      {error ? <Feedback type="error" message={error} /> : null}
      {success ? <Feedback type="success" message={success} /> : null}

      <section className="panel panel--compact">
        <div className="panel__header panel__header--row panel__header--sticky">
          <h3>Contas cadastradas</h3>
          <button className="button button--ghost button--small" type="button" onClick={openNew}>+ Nova conta</button>
        </div>
        {loading ? <LoadingBlock label="Carregando..." /> : null}
        {!loading && contas.length === 0 ? <EmptyState message="Nenhuma conta bancária cadastrada." /> : null}
        {!loading && contas.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Banco</th>
                  <th>Tipo</th>
                  <th>Agência / Conta</th>
                  <th>Saldo Atual</th>
                  <th>Fluxo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong></td>
                    <td>{c.bancoRef?.nome ?? c.banco ?? '—'}</td>
                    <td>{TIPO_LABELS[c.tipo]}</td>
                    <td>{[c.agencia, c.numeroConta].filter(Boolean).join(' / ') || '—'}</td>
                    <td>{fmt(c.saldoAtual)}</td>
                    <td>
                      <span className={`badge ${c.incluiFluxoCaixa ? 'badge--success' : 'badge--muted'}`}>
                        {c.incluiFluxoCaixa ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.ativo ? 'badge--success' : 'badge--muted'}`}>
                        {c.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-toolbar">
                        <button className="button button--ghost button--small" type="button" onClick={() => openEdit(c)}>Editar</button>
                        <button className="button button--danger button--small" type="button" onClick={() => void handleDelete(c)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={open} title={editingId ? 'Editar conta bancária' : 'Nova conta bancária'} onClose={closeModal}>
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field field--span-2">
            <label>Nome da conta</label>
            <input value={f.nome} onChange={(e) => setForm((x) => ({ ...x, nome: e.target.value }))} placeholder="Ex.: Conta Corrente Itaú" required />
          </div>

          <div className="field">
            <label>Banco</label>
            <select
              value={f.bancoId}
              onChange={(e) => {
                const id = e.target.value;
                const banco = bancos.find((b) => b.id === id);
                setForm((x) => ({ ...x, bancoId: id, banco: banco?.nome ?? x.banco }));
              }}
            >
              <option value="">Selecionar banco...</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>{b.codigo} — {b.nome}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tipo</label>
            <select value={f.tipo} onChange={(e) => setForm((x) => ({ ...x, tipo: e.target.value as TipoContaBancaria }))}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Agência</label>
            <input value={f.agencia} onChange={(e) => setForm((x) => ({ ...x, agencia: e.target.value }))} placeholder="0001" />
          </div>

          <div className="field">
            <label>Número da conta</label>
            <input value={f.numeroConta} onChange={(e) => setForm((x) => ({ ...x, numeroConta: e.target.value }))} placeholder="12345-6" />
          </div>

          <div className="field field--span-2">
            <label>Chave PIX</label>
            <input value={f.chavePix} onChange={(e) => setForm((x) => ({ ...x, chavePix: e.target.value }))} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
          </div>

          <div className="field">
            <label>Saldo inicial (R$)</label>
            <input
              type="number"
              step="0.01"
              value={f.saldoInicial}
              onChange={(e) => setForm((x) => ({ ...x, saldoInicial: e.target.value }))}
            />
          </div>

          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={f.incluiFluxoCaixa} onChange={(e) => setForm((x) => ({ ...x, incluiFluxoCaixa: e.target.checked }))} />
              Incluir no fluxo de caixa
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={f.ativo} onChange={(e) => setForm((x) => ({ ...x, ativo: e.target.checked }))} />
              Ativa
            </label>
          </div>

          <div className="field field--span-2">
            <button className="button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
