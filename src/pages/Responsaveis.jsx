import { Users } from 'lucide-react'
import { useMasterData } from '../context/MasterDataContext'
import { useAssets } from '../context/AssetsContext'
import CrudTable from '../components/cadastros/CrudTable'

export default function Responsaveis() {
  const { responsaveis, setores } = useMasterData()
  const { assets } = useAssets()

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'setor', label: 'Setor' },
  ]

  const formFields = [
    { key: 'nome', label: 'Nome completo', required: true, placeholder: 'Ex: João Silva' },
    {
      key: 'setor',
      label: 'Setor',
      type: 'select',
      options: setores.items.map(s => ({ value: s.nome, label: s.nome })),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Users size={20} className="text-blue-500 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestão de Responsáveis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pessoas que podem ser atribuídas aos ativos de TI</p>
        </div>
      </div>

      <CrudTable
        title="Responsáveis"
        subtitle="Lista completa de colaboradores e contatos"
        items={responsaveis.items}
        columns={columns}
        formFields={formFields}
        emptyForm={{ nome: '', setor: '' }}
        onAdd={responsaveis.add}
        onUpdate={responsaveis.update}
        onDelete={responsaveis.remove}
        searchKeys={['nome', 'setor']}
        isInUse={(item) => assets.filter(a => a.assignedTo === item.nome).length}
      />
    </div>
  )
}
