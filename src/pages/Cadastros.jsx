import { useState } from 'react'
import { Building2, Tags, Cpu, Activity, UserCog, CalendarClock, Plus, X, Save, Loader2, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import CrudTable from '../components/cadastros/CrudTable'
import { useAuth } from '../context/AuthContext'

// ─── Setores ──────────────────────────────────────────────────────────────────
function TabSetores({ assets }) {
  const { setores } = useMasterData()

  const columns = [
    { key: 'nome', label: 'Setor' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'ramal', label: 'Ramal' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome do setor', required: true, placeholder: 'Ex: Tecnologia da Informação' },
    { key: 'descricao', label: 'Descrição', placeholder: 'Breve descrição do setor' },
    { key: 'responsavel', label: 'Responsável', placeholder: 'Nome do gestor' },
    { key: 'ramal', label: 'Ramal', placeholder: 'Ex: 1001' },
  ]

  return (
    <CrudTable
      title="Setores"
      subtitle="Departamentos e áreas da empresa"
      items={setores.items}
      columns={columns}
      formFields={formFields}
      emptyForm={{ nome: '', descricao: '', responsavel: '', ramal: '' }}
      onAdd={setores.add}
      onUpdate={setores.update}
      onDelete={setores.remove}
      searchKeys={['nome', 'responsavel', 'descricao']}
      isInUse={(item) => assets.filter(a => a.department === item.nome).length}
    />
  )
}

// ─── Categorias ───────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { value: 'bg-blue-100 text-blue-700', label: 'Azul' },
  { value: 'bg-violet-100 text-violet-700', label: 'Violeta' },
  { value: 'bg-orange-100 text-orange-700', label: 'Laranja' },
  { value: 'bg-green-100 text-green-700', label: 'Verde' },
  { value: 'bg-cyan-100 text-cyan-700', label: 'Ciano' },
  { value: 'bg-pink-100 text-pink-700', label: 'Rosa' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Amarelo' },
  { value: 'bg-red-100 text-red-700', label: 'Vermelho' },
  { value: 'bg-slate-100 text-slate-700', label: 'Cinza' },
  { value: 'bg-emerald-100 text-emerald-700', label: 'Esmeralda' },
]

const ICON_OPTIONS = [
  'Laptop', 'Monitor', 'Server', 'Printer', 'Network', 'Phone',
  'Package', 'Box', 'Cpu', 'HardDrive', 'Wifi', 'Camera',
  'Headphones', 'Keyboard', 'Mouse', 'Tablet', 'Watch', 'Tv',
]

function TabCategorias({ assets }) {
  const { categorias } = useMasterData()

  const columns = [
    {
      key: 'label',
      label: 'Categoria',
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.color}`}>
          {item.label}
        </span>
      ),
    },
    { key: 'icon', label: 'Ícone' },
    { key: 'descricao', label: 'Descrição' },
  ]

  const formFields = [
    { key: 'label', label: 'Nome da categoria', required: true, placeholder: 'Ex: Tablet' },
    { key: 'icon', label: 'Ícone', type: 'select', options: ICON_OPTIONS.map(i => ({ value: i, label: i })) },
    { key: 'color', label: 'Cor', type: 'select', options: COLOR_OPTIONS },
    { key: 'descricao', label: 'Descrição', placeholder: 'Breve descrição' },
  ]

  return (
    <CrudTable
      title="Categorias"
      subtitle="Tipos de ativos de TI disponíveis para classificação"
      items={categorias.items}
      columns={columns}
      formFields={formFields}
      emptyForm={{ label: '', icon: 'Box', color: 'bg-slate-100 text-slate-700', descricao: '' }}
      onAdd={(data) => categorias.add({ ...data, id: data.label.toLowerCase().replace(/\s+/g, '-') })}
      onUpdate={categorias.update}
      onDelete={categorias.remove}
      searchKeys={['label', 'descricao']}
      isInUse={(item) => assets.filter(a => a.category === item.id).length}
    />
  )
}

// ─── Marcas ───────────────────────────────────────────────────────────────────
const SEGMENTOS = ['Hardware', 'Software', 'Rede', 'Periférico', 'Telefonia', 'Cloud', 'Outro']

function TabMarcas({ assets }) {
  const { marcas } = useMasterData()

  const columns = [
    { key: 'nome', label: 'Marca' },
    { key: 'segmento', label: 'Segmento' },
    { key: 'site', label: 'Site' },
    { key: 'observacoes', label: 'Observações' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome da marca', required: true, placeholder: 'Ex: Dell' },
    { key: 'segmento', label: 'Segmento', type: 'select', options: SEGMENTOS },
    { key: 'site', label: 'Site', placeholder: 'Ex: www.dell.com' },
    { key: 'observacoes', label: 'Observações', type: 'textarea', placeholder: 'Informações adicionais...' },
  ]

  return (
    <CrudTable
      title="Marcas / Fabricantes"
      subtitle="Fabricantes e fornecedores dos ativos de TI"
      items={marcas.items}
      columns={columns}
      formFields={formFields}
      emptyForm={{ nome: '', segmento: 'Hardware', site: '', observacoes: '' }}
      onAdd={marcas.add}
      onUpdate={marcas.update}
      onDelete={marcas.remove}
      searchKeys={['nome', 'segmento', 'site']}
      isInUse={(item) => assets.filter(a => a.brand === item.nome).length}
    />
  )
}

// ─── Status ───────────────────────────────────────────────────────────────────
const COR_SITUACAO_OPTIONS = [
  { value: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Verde (Em Uso)' },
  { value: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Azul (Em Estoque)' },
  { value: 'bg-red-100 text-red-700 border-red-200', label: 'Vermelho (Obsoleto)' },
  { value: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Âmbar (Atenção)' },
  { value: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Cinza (Neutro)' },
  { value: 'bg-violet-100 text-violet-700 border-violet-200', label: 'Violeta' },
]

function TabStatus({ assets }) {
  const { situacoes } = useMasterData()

  const columns = [
    {
      key: 'nome',
      label: 'Status',
      render: (item) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${item.cor}`}>
          {item.nome}
        </span>
      ),
    },
    { key: 'descricao', label: 'Descrição' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome da situação', required: true, placeholder: 'Ex: Em Estoque' },
    { key: 'descricao', label: 'Descrição', placeholder: 'Breve descrição' },
    { key: 'cor', label: 'Cor do badge', type: 'select', options: COR_SITUACAO_OPTIONS },
  ]

  return (
    <CrudTable
      title="Status"
      subtitle="Status operacional dos ativos no inventário"
      items={situacoes.items}
      columns={columns}
      formFields={formFields}
      emptyForm={{ nome: '', descricao: '', cor: 'bg-blue-100 text-blue-700 border-blue-200' }}
      onAdd={(data) => situacoes.add({ ...data, id: data.nome.toLowerCase().replace(/\s+/g, '_') })}
      onUpdate={situacoes.update}
      onDelete={situacoes.remove}
      searchKeys={['nome', 'descricao']}
      isInUse={(item) => assets.filter(a => a.status === item.id).length}
    />
  )
}

// ─── Analistas ────────────────────────────────────────────────────────────────
function TabAnalistas({ assets }) {
  const { analistas } = useMasterData()

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'matricula', label: 'Matrícula' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome completo', required: true, placeholder: 'Ex: João Silva' },
    { key: 'matricula', label: 'Matrícula', required: true, placeholder: 'Ex: MAT-001' },
  ]

  return (
    <CrudTable
      title="Analistas"
      subtitle="Técnicos responsáveis por manutenções nos ativos de TI"
      items={analistas.items}
      columns={columns}
      formFields={formFields}
      emptyForm={{ nome: '', matricula: '' }}
      onAdd={analistas.add}
      onUpdate={analistas.update}
      onDelete={analistas.remove}
      searchKeys={['nome', 'matricula']}
      isInUse={(item) =>
        assets.reduce((count, a) =>
          count + (a.maintenances ?? []).filter(m => m.analyst === item.nome).length, 0
        )
      }
    />
  )
}

// ─── Períodos de Manutenção ───────────────────────────────────────────────────
const EMPTY_PERIODO = { tipo: '', periodico: false, dias: '', descricao: '' }

function TabPeriodosManutencao() {
  const { periodosManutencao } = useMasterData()
  const { profile } = useAuth()
  const canEdit = profile?.role === 'admin' || profile?.role === 'user'

  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_PERIODO)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)

  function openAdd()    { setForm({ ...EMPTY_PERIODO }); setErrors({}); setAdding(true); setEditing(null) }
  function openEdit(it) { setForm({ tipo: it.tipo || '', periodico: it.periodico || false, dias: it.dias ?? '', descricao: it.descricao || '' }); setErrors({}); setEditing(it); setAdding(false) }
  function closeForm()  { setAdding(false); setEditing(null); setErrors({}) }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val, ...(key === 'periodico' && !val ? { dias: '' } : {}) }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }))
  }

  function validate() {
    const e = {}
    if (!form.tipo.trim()) e.tipo = 'Campo obrigatório'
    if (form.periodico && (!form.dias || Number(form.dias) < 1)) e.dias = 'Informe o intervalo em dias'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const data = {
        tipo:      form.tipo.trim(),
        periodico: form.periodico,
        dias:      form.periodico ? Number(form.dias) : null,
        descricao: form.descricao.trim() || null,
      }
      if (editing) await periodosManutencao.update(editing.id, data)
      else         await periodosManutencao.add(data)
      closeForm()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item) {
    if (window.confirm(`Excluir "${item.tipo}"?`)) {
      try { await periodosManutencao.remove(item.id) }
      catch { alert('Erro ao excluir. Tente novamente.') }
    }
  }

  const showForm = adding || editing !== null

  const inp = (key) => [
    'w-full text-sm border rounded-lg px-3 py-2',
    'focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-500/20',
    'bg-white dark:bg-slate-800',
    'text-slate-800 dark:text-slate-100',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    errors[key] ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600',
  ].join(' ')

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Períodos de Manutenção</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tipos de manutenção preventiva e seus intervalos</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={15} /> Novo
          </button>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-700/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              {editing ? 'Editar período' : 'Novo período'}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

              {/* Tipo */}
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Tipo de manutenção <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.tipo}
                  onChange={e => setField('tipo', e.target.value)}
                  placeholder="Ex: Limpeza e Troca de Pasta Térmica"
                  className={inp('tipo')}
                />
                {errors.tipo && <p className="text-xs text-red-500">{errors.tipo}</p>}
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={e => setField('descricao', e.target.value)}
                  placeholder="Descrição opcional"
                  className={inp('descricao')}
                />
              </div>

              {/* Checkbox periódico */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Periodicidade</label>
                <label className="flex items-center gap-2.5 h-[38px] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.periodico}
                    onChange={e => setField('periodico', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">Evento periódico</span>
                </label>
              </div>

              {/* Intervalo */}
              {form.periodico && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Intervalo (dias) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.dias}
                    onChange={e => setField('dias', e.target.value)}
                    placeholder="Ex: 90"
                    className={inp('dias')}
                  />
                  {errors.dias && <p className="text-xs text-red-500">{errors.dias}</p>}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editing ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tipo de Manutenção</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Periódico</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Intervalo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Descrição</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {periodosManutencao.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 dark:text-slate-500">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : periodosManutencao.items.map(item => (
                <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{item.tipo}</td>
                  <td className="px-4 py-3">
                    {item.periodico
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40"><CheckCircle2 size={11} /> Sim</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">Não</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {item.periodico && item.dias
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40">{item.dias} dias</span>
                      : <span className="text-slate-400 dark:text-slate-500">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.descricao || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (<>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {periodosManutencao.items.length} {periodosManutencao.items.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'setores',    label: 'Setores',              icon: Building2,    component: TabSetores },
  { id: 'categorias', label: 'Categorias',            icon: Tags,         component: TabCategorias },
  { id: 'marcas',     label: 'Marcas',                icon: Cpu,          component: TabMarcas },
  { id: 'situacoes',  label: 'Status',                icon: Activity,     component: TabStatus },
  { id: 'analistas',  label: 'Analistas',             icon: UserCog,      component: TabAnalistas },
  { id: 'periodos',   label: 'Períodos de Manutenção', icon: CalendarClock, component: TabPeriodosManutencao },
]

export default function Cadastros() {
  const [activeTab, setActiveTab] = useState('setores')
  const { setores, categorias, marcas, situacoes, analistas, periodosManutencao } = useMasterData()
  const { assets } = useAssets()

  const counts = {
    setores:    setores.items.length,
    categorias: categorias.items.length,
    marcas:     marcas.items.length,
    situacoes:  situacoes.items.length,
    analistas:  analistas.items.length,
    periodos:   periodosManutencao.items.length,
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? TabSetores

  return (
    <div className="p-6 space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            ].join(' ')}
          >
            <Icon size={15} />
            {label}
            <span className={[
              'text-xs px-1.5 py-0.5 rounded-full font-semibold',
              activeTab === id
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            ].join(' ')}>
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <ActiveComponent assets={assets} />
    </div>
  )
}
