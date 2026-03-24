import { useState, useEffect, useMemo } from 'react'
import {
  PlusCircle,
  ArrowUpCircle,
  LayoutDashboard,
  ClipboardList,
  History,
  AlertTriangle,
  Search,
  CheckCircle2
} from 'lucide-react'
import './App.css'

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
  const [parts, setParts] = useState<Part[]>(() => {
    const saved = localStorage.getItem('auto_parts');
    return saved ? JSON.parse(saved) : [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('auto_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Perisistence
  useEffect(() => {
    localStorage.setItem('auto_parts', JSON.stringify(parts));
  }, [parts]);

  useEffect(() => {
    localStorage.setItem('auto_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Calculations
  const stockLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    parts.forEach(p => levels[p.id] = 0);
    transactions.forEach(t => {
      if (t.type === 'IN') levels[t.partId] += t.quantity;
      else levels[t.partId] -= t.quantity;
    });
    return levels;
  }, [parts, transactions]);

  const stats = useMemo(() => {
    const totalItems = Object.values(stockLevels).reduce((a, b) => a + b, 0);
    const lowStock = parts.filter(p => stockLevels[p.id] <= p.minStock).length;
    return { totalItems, lowStock, totalParts: parts.length };
  }, [parts, stockLevels]);

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Actions
  const addPart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPart: Part = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      minStock: Number(formData.get('minStock')),
    };
    setParts([...parts, newPart]);
    setActiveTab('inventory');
  };

  const recordTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'IN' | 'OUT';
    const quantity = Number(formData.get('quantity'));
    const partId = formData.get('partId') as string;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      partId,
      type,
      quantity,
      date: new Date().toLocaleString('pt-BR'),
      reason: formData.get('reason') as string,
    };
    setTransactions([newTransaction, ...transactions]);
    e.currentTarget.reset();
    alert('Movimentação registrada com sucesso!');
  };

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
            <h2>Inventário Atual</h2>
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
                    const current = stockLevels[p.id];
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
            <h2>Histórico de Movimentações</h2>
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
