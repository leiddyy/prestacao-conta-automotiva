import { useState, useEffect, useMemo } from 'react'
import {
  PlusCircle,
  ArrowUpCircle,
  LayoutDashboard,
  ClipboardList,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  Loader2,
  Download
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Initialize Supabase
const supabaseUrl = 'https://gzauhxnjkwplshthrfcq.supabase.co'
const supabaseKey = 'sb_publishable_Wstl7HmG0LiXbJxD9rY27A_tcHf__4N'
const supabase = createClient(supabaseUrl, supabaseKey)

interface Part {
  id: string;
  name: string;
  sku: string;
  category: string;
  minStock: number;
}

interface Transaction {
  id: string;
  partId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  reason: string;
}

type Tab = 'dashboard' | 'inventory' | 'transactions' | 'register';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [parts, setParts] = useState<Part[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data from Supabase
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: partsData, error: partsError } = await supabase
        .from('parts')
        .select('*')
        .order('name');
      
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (partsError || transError) throw partsError || transError;

      // Map Supabase data (snake_case) to our interface (camelCase)
      setParts(partsData.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        minStock: p.min_stock
      })));

      setTransactions(transData.map(t => ({
        id: t.id,
        partId: t.part_id,
        type: t.type,
        quantity: t.quantity,
        date: new Date(t.date).toLocaleString('pt-BR'),
        reason: t.reason
      })));
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
      alert('Erro ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to export CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    // Header setup based on provided keys
    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(obj => 
      Object.values(obj)
        .map(val => (typeof val === 'string' ? `"${val}"` : val))
        .join(';')
    ).join('\n');

    // Add BOM for UTF-8 Excel support (Crucial for accents)
    const csvContent = "\uFEFF" + headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const stockLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    parts.forEach(p => levels[p.id] = 0);
    transactions.forEach(t => {
      if (t.type === 'IN') levels[t.partId] = (levels[t.partId] || 0) + t.quantity;
      else levels[t.partId] = (levels[t.partId] || 0) - t.quantity;
    });
    return levels;
  }, [parts, transactions]);

  const stats = useMemo(() => {
    const totalItems = Object.values(stockLevels).reduce((a, b) => a + b, 0);
    const lowStock = parts.filter(p => (stockLevels[p.id] || 0) <= p.minStock).length;
    return { totalItems, lowStock, totalParts: parts.length };
  }, [parts, stockLevels]);

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Actions
  const addPart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newPartData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      min_stock: Number(formData.get('minStock')),
    };

    const { data, error } = await supabase
      .from('parts')
      .insert([newPartData])
      .select();

    if (error) {
      alert('Erro ao cadastrar peça: ' + error.message);
    } else if (data) {
      const p = data[0];
      setParts([...parts, {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        minStock: p.min_stock
      }]);
      setActiveTab('inventory');
      (e.target as HTMLFormElement).reset();
    }
  };

  const recordTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'IN' | 'OUT';
    const quantity = Number(formData.get('quantity'));
    const partId = formData.get('partId') as string;

    const newTransData = {
      part_id: partId,
      type,
      quantity,
      reason: formData.get('reason') as string,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTransData])
      .select();

    if (error) {
      alert('Erro ao registrar movimentação: ' + error.message);
    } else if (data) {
      const t = data[0];
      setTransactions([{
        id: t.id,
        partId: t.part_id,
        type: t.type as 'IN' | 'OUT',
        quantity: t.quantity,
        date: new Date(t.date).toLocaleString('pt-BR'),
        reason: t.reason
      }, ...transactions]);
      (e.target as HTMLFormElement).reset();
      alert('Movimentação registrada com sucesso!');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        <p>Conectando ao banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="app-header">
        <div className="title-group">
          <h1>Sistema de Prestação</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sistema de Prestação de Contas Automotiva</p>
        </div>
        <nav className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <ClipboardList size={18} /> Inventário
          </button>
          <button
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <History size={18} /> Movimentações
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            <PlusCircle size={18} /> Cadastrar
          </button>
        </nav>
      </header>

      {activeTab === 'dashboard' && (
        <div className="data-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Total de Peças Cadastradas</div>
              <div className="value">{stats.totalParts}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total em Estoque</div>
              <div className="value">{stats.totalItems}</div>
            </div>
            <div className="stat-card">
              <div className="label" style={{ color: stats.lowStock > 0 ? 'var(--danger)' : 'inherit' }}>
                Itens em Alerta de Estoque
              </div>
              <div className="value" style={{ color: stats.lowStock > 0 ? 'var(--danger)' : 'inherit' }}>
                {stats.lowStock}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2><ArrowUpCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }} /> Registrar Entrada/Saída</h2>
            </div>
            <div className="card-content">
              {parts.length === 0 ? (
                <p className="empty-state">Cadastre peças antes de registrar movimentações.</p>
              ) : (
                <form onSubmit={recordTransaction} className="form-grid">
                  <div className="form-group">
                    <label>Peça</label>
                    <select name="partId" required>
                      <option value="">Selecione uma peça...</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select name="type" required>
                      <option value="IN">Entrada (+)</option>
                      <option value="OUT">Saída (-)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantidade</label>
                    <input type="number" name="quantity" min="1" required />
                  </div>
                  <div className="form-group">
                    <label>Motivo/Nota</label>
                    <input type="text" name="reason" placeholder="Ex: Reposição, Venda..." />
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <button type="submit" className="primary">Salvar</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <h2>Inventário Atual</h2>
               <button 
                onClick={() => exportToCSV(
                  parts.map(p => ({
                    Nome: p.name,
                    SKU: p.sku,
                    Categoria: p.category,
                    Estoque: stockLevels[p.id] || 0,
                    EstoqueMinimo: p.minStock
                  })), 
                  'relatorio-estoque'
                )}
                className="tab-btn" 
                style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', fontSize: '0.8rem' }}
               >
                 <Download size={14} /> Exportar Excel
               </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar peça ou código..."
                style={{ paddingLeft: '2.5rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="card-content">
            {filteredParts.length === 0 ? (
              <p className="empty-state">Nenhuma peça encontrada.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Código (SKU)</th>
                    <th>Categoria</th>
                    <th>Estoque Atual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map(p => {
                    const current = stockLevels[p.id] || 0;
                    const isLow = current <= p.minStock;
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.sku}</td>
                        <td>{p.category}</td>
                        <td style={{ fontWeight: 600 }}>{current}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-out"><AlertTriangle size={12} /> Estoque Baixo</span>
                          ) : (
                            <span className="badge badge-in"><CheckCircle2 size={12} /> Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <h2>Histórico</h2>
               <button 
                onClick={() => exportToCSV(
                  transactions.map(t => ({
                    Data: t.date,
                    Peça: parts.find(p => p.id === t.partId)?.name || 'Desconhecida',
                    Tipo: t.type === 'IN' ? 'Entrada (+)' : 'Saída (-)',
                    Quantidade: t.quantity,
                    Observação: t.reason
                  })), 
                  'historico-movimentacoes'
                )}
                className="tab-btn" 
                style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', fontSize: '0.8rem' }}
               >
                 <Download size={14} /> Exportar Excel
               </button>
            </div>
          </div>
          <div className="card-content">
            {transactions.length === 0 ? (
              <p className="empty-state">Nenhuma movimentação registrada.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peça</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => {
                    const part = parts.find(p => p.id === t.partId);
                    return (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{part?.name || 'Excluída'}</td>
                        <td>
                          <span className={`badge ${t.type === 'IN' ? 'badge-in' : 'badge-out'}`}>
                            {t.type === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                          </span>
                        </td>
                        <td>{t.quantity}</td>
                        <td>{t.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card-header">
            <h2>Cadastrar Nova Peça</h2>
          </div>
          <div className="card-content">
            <form onSubmit={addPart} className="dashboard-container" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label>Nome da Peça</label>
                <input name="name" placeholder="Ex: Pastilha de Freio" required />
              </div>
              <div className="form-group">
                <label>Código (SKU/Part Number)</label>
                <input name="sku" placeholder="Ex: PF-2023-XYZ" required />
              </div>
              <div className="form-group">
                <label>Categoria</label>
                <select name="category">
                  <option value="Motor">Motor</option>
                  <option value="Freios">Freios</option>
                  <option value="Suspensão">Suspensão</option>
                  <option value="Elétrica">Elétrica</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estoque Mínimo (Alerta)</label>
                <input type="number" name="minStock" defaultValue="5" min="0" required />
              </div>
              <button type="submit" className="primary">Confirmar Cadastro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
