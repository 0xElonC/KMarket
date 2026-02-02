import React from 'react';
import { ArrowLeft, TrendingUp, Layers, Zap, Lock, Users, Clock, Shield, BarChart3, Binary, XCircle, BrainCircuit, Globe, Coins } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HowItWorksProps {
  onNavigate: (page: Page) => void;
}

export default function HowItWorks({ onNavigate }: HowItWorksProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-12 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate(Page.HOME)}
          className="p-3 rounded-xl neu-out hover:neu-in transition-all flex items-center gap-2 text-gray-400 hover:text-gray-100"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">返回首页</span>
        </button>
        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          预测市场 2.0
        </h1>
      </div>

      {/* 1. 项目定义：预测市场 2.0 */}
      <section className="neu-out p-8 md:p-12 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6 border border-primary/20">
            <span>🚀 核心理念</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-6 leading-tight">
            不仅仅是结果，<br/>更是<span className="text-primary">过程的可预测</span>
          </h2>
          <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
            <p>
              传统预测市场（Prediction Market 1.0）通常局限于简单的"是/否"二元结果，例如"谁会赢得大选？"或"今晚会下雨吗？"。
            </p>
            <p className="font-semibold text-gray-100">
              KMarket 重新定义了这一领域，我们称之为<span className="text-accent mx-1">预测市场 2.0</span>。
            </p>
            <p>
              我们的核心创新理念是<span className="text-gray-100 font-bold mx-1">"万物皆可线"</span>。我们将任何可被量化的、被追踪的数据转化为连续的 K 线图。用户不再是被动等待最终结果，而是可以像交易股票或加密货币一样，对事件发展的<b>全过程</b>、<b>数值区间</b>进行精准预测。
            </p>
          </div>
        </div>
      </section>

      {/* 2. 传统市场痛点 vs 解决方案 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="neu-out p-8 rounded-3xl border border-red-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500">
              <XCircle size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">传统市场痛点</h2>
          </div>
          <ul className="space-y-4">
            <PainPointItem 
              title="维度单一" 
              message="仅支持简单的二元胜负，无法捕捉比赛分差、支持率变化等精细数值。"
            />
            <PainPointItem 
              title="风险过高" 
              message="传统金融衍生品的高杠杆容易导致爆仓，普通用户难以把控。"
            />
            <PainPointItem 
              title="数据孤岛" 
              message="政治、体育、金融预测分散在不同平台，缺乏统一的交易体验。"
            />
            <PainPointItem 
              title="流动性不足" 
              message="往往是用户与庄家对赌，缺乏透明且可持续的流动性激励机制。"
            />
          </ul>
        </div>

        <div className="neu-out p-8 bg-gradient-to-br from-background to-primary/5 rounded-3xl border border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">KMarket 解决方案</h2>
          </div>
          <ul className="space-y-4">
            <SolutionItem 
              icon={<BarChart3 size={18} />}
              title="万物线图化" 
              message="统一引擎将所有数据转化为标准 K 线，提供一致的交易体验。"
            />
            <SolutionItem 
              icon={<Layers size={18} />}
              title="Tick 区间预测" 
              message="预测数值落入的特定区间（如+1%~+2%），策略更丰富，回报更丰厚。"
            />
            <SolutionItem 
              icon={<Lock size={18} />}
              title="无爆仓风险" 
              message="最大损失仅限于单笔下注本金，不会因市场波动而被强制平仓。"
            />
            <SolutionItem 
              icon={<Coins size={18} />}
              title="去中心化流动性" 
              message="LP 注入资金获得手续费和胜负分红，人人皆可做市。"
            />
          </ul>
        </div>
      </section>

      {/* 3. 万物线图化场景 */}
      <section className="neu-out p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-accent/10 text-accent">
            <Globe size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">万物线图化：打破边界</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ScenarioCard 
            emoji="🏛️" 
            title="政治事件" 
            examples={['选举人票数', '候选人支持率', '法案通过概率']}
            period="日/周/月"
          />
          <ScenarioCard 
            emoji="⚽" 
            title="体育竞技" 
            examples={['实时比分', '球员数据(得分)', '比赛分差']}
            period="分钟/半场"
          />
          <ScenarioCard 
            emoji="📊" 
            title="经济金融" 
            examples={['非农就业数据', '美联储利率', '公司财报营收']}
            period="季度/年度"
          />
          <ScenarioCard 
            emoji="🎮" 
            title="电竞娱乐" 
            examples={['CS饰品价格', '比赛击杀数', '电影票房']}
            period="实时/日"
          />
        </div>
      </section>

      {/* 4. 技术架构与合约设计 */}
      <section className="neu-out p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <Zap size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">核心架构与协作机制</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* 混合架构逻辑 */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-200 border-l-4 border-primary pl-4">链上安全 + 链下极速</h3>
            <p className="text-gray-300 leading-relaxed">
              为了突破区块链的性能瓶颈，KMarket 采用了独创的 Layer 2 混合架构。
              用户资金始终锁定在智能合约中，但交易撮合与计在链下服务器完成，
              实现了<b>0 Gas 费</b>、<b>毫秒级响应</b>的中心化交易所体验，同时保留了 DeFi 的非托管属性。
            </p>
            
            <div className="bg-background/30 rounded-xl p-4 border border-white/5 space-y-3">
               <WorkflowItem 
                 step="1" 
                 title="资金托管 (On-Chain)" 
                 desc="用户将 USDC 存入 Vault 合约，映射生成代理钱包。"
               />
               <WorkflowItem 
                 step="2" 
                 title="签名下单 (Off-Chain)" 
                 desc="用户仅需对订单进行 EIP-712 签名，无需上链，无 Gas 消耗。"
               />
               <WorkflowItem 
                 step="3" 
                 title="撮合结算 (Hybrid)" 
                 desc="高性能引擎实时撮合，定期将状态根 Merkle Root 提交上链验证。"
               />
               <WorkflowItem 
                 step="4" 
                 title="提现离场 (On-Chain)" 
                 desc="用户随时可凭服务器签名或在紧急模式下直接从合约提款。"
               />
            </div>
          </div>

          {/* 智能合约设计 */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-200 border-l-4 border-accent pl-4">智能合约体系</h3>
            <p className="text-gray-300">
              我们的合约代码开源且经过审计，核心组件各司其职：
            </p>
            
            <div className="grid gap-4">
              <ContractCard 
                name="Vault (金库合约)" 
                desc="系统的资金池。管理所有用户存款 (User Balance) 和流动性资金 (LP Pool)。它不包含业务逻辑，仅负责最底层的资金进出，确保资金隔离安全。"
              />
              <ContractCard 
                name="UserProxyWallet (代理钱包)" 
                desc="为每位用户自动生成的智能合约钱包。它允许用户通过签名授权交易，实现了无需频繁交互钱包的'无感交易'体验，并记录用户的 nonce 以防重放攻击。"
              />
              <ContractCard 
                name="TradingEngine (交易引擎)" 
                desc="负责验证链下提交的批量结算指令。它检查签名有效性、验证 Merkle Proof，并更新链上的资金状态，是连接链下高性能与链上安全的桥梁。"
              />
            </div>
          </div>
        </div>

        {/* 赔率算法小节 */}
        <div className="pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit size={20} className="text-purple-400" />
                <h3 className="text-lg font-bold text-gray-200">动态赔率算法</h3>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                赔率不再是固定的，而是基于市场供需、时间衰减和波动率的动态函数：
              </p>
              <div className="neu-in p-3 rounded-lg font-mono text-xs text-center text-primary/80">
                Odds = 1 + (Base × Distance × Liquidity × TimeDecay)
              </div>
            </div>
            <div>
               <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-green-400" />
                <h3 className="text-lg font-bold text-gray-200">去中心化风控</h3>
              </div>
              <p className="text-gray-400 text-sm">
                即使服务器宕机或被审查，用户仍可通过合约中的 <code>EmergencyWithdraw</code> 
                函数，在时间锁过期后直接取回资金，实现了彻底的抗审查性。
              </p>
            </div>
        </div>
      </section>

      {/* 5. 经济模型与生态 */}
      <section className="neu-out p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                <Coins size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">经济模型：共享与共赢</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* 统一流动性池 */}
            <div>
                <h3 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-success"/> 统一流动性池 (Unified LP)
                </h3>
                <p className="text-gray-400 mb-4 leading-relaxed">
                    传统预测市场的流动性往往分散在成百上千个独立的事件池中。KMarket 创新引入了<b>全局统一流动性池</b>模式：
                </p>
                <ul className="space-y-3">
                    <FeatureList text="单一资金池支持所有市场（体育、政治、金融）" />
                    <FeatureList text="做市商 (LP) 作为所有交易者的对手方" />
                    <FeatureList text="资金利用率最大化，杜绝'死盘'" />
                </ul>
            </div>

            {/* 价值捕获 */}
            <div>
                <h3 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-accent"/> 价值分配体系
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center neu-in p-4 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-gray-200 font-bold">交易者 (Traders)</span>
                            <span className="text-xs text-gray-500">凭认知变现</span>
                        </div>
                        <span className="text-success font-bold">本金 + 赔率奖金</span>
                    </div>
                    <div className="flex justify-between items-center neu-in p-4 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-gray-200 font-bold">做市商 (LPs)</span>
                            <span className="text-xs text-gray-500">提供深度与承兑</span>
                        </div>
                        <span className="text-primary font-bold">胜负盈余 + 交易手续费</span>
                    </div>
                     <div className="flex justify-between items-center neu-in p-4 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-gray-200 font-bold">协议治理 (DAO)</span>
                            <span className="text-xs text-gray-500">KMARK 代币持有者</span>
                        </div>
                        <span className="text-accent font-bold">回购销毁 + 治理权</span>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* 6. 社会意义与数据价值 */}
      <section className="neu-out p-8 md:p-12 rounded-3xl relative overflow-hidden border border-accent/10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
        
        <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold mb-2 border border-accent/20">
                    <span>🌍 社会价值</span>
                 </div>
                <h2 className="text-3xl font-bold text-gray-100 leading-tight">
                    这不仅仅是一次预测，<br/>更是对<span className="text-accent">时代脉搏</span>的记录
                </h2>
                <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                        社会事件的走向从来不是非黑即白的瞬间坍缩，而是一场漫长而动态的博弈。
                        民意在变，政策在变，局势在变。
                    </p>
                    <p>
                        传统的二元预测（胜/负）丢失了过程中最宝贵的信息——<span className="text-gray-100 font-semibold">变化的轨迹</span>。
                        KMarket 通过将事件线图化，忠实记录了每一个时间切片下的群体共识。
                    </p>
                    <p className="p-4 rounded-xl bg-accent/5 border border-accent/10 text-sm text-gray-200 italic">
                        "基于过程的预测市场，比结果本身更能揭示未来的形状。我们将建立最有价值的人类选择走势数据库。"
                    </p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 gap-4 w-full">
                <DataValueCard 
                    icon={<Binary size={24} />}
                    title="超越二元对立"
                    desc="世界不是由0和1组成的。我们捕捉的是从0到1之间，那99%的灰度变化与情绪波动。"
                />
                <DataValueCard 
                    icon={<TrendingUp size={24} />}
                    title="动态民意晴雨表"
                    desc="实时反映政策颁布、突发新闻对群体心理的冲击曲线，为社会学研究提供量化依据。"
                />
                <DataValueCard 
                    icon={<BarChart3 size={24} />}
                    title="可持续的趋势数据库"
                    desc="沉淀下来的不仅是 K 线，而是历史进程中，每一次重大抉择背后的群体信心走势图。"
                />
            </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-gray-400 mb-6">
          准备好体验预测市场 2.0 了吗？
        </p>
        <button
          onClick={() => onNavigate(Page.MARKETS)}
          className="px-12 py-5 rounded-2xl text-lg font-bold bg-primary text-background hover:scale-105 transition-transform inline-flex items-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        >
          立即开始预测
          <TrendingUp size={20} />
        </button>
      </section>
    </div>
  );
}

// Helper Components
function PainPointItem({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
      <div>
        <h4 className="font-bold text-gray-200">{title}</h4>
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function SolutionItem({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="flex gap-4">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 h-fit">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-gray-200">{title}</h4>
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function ScenarioCard({ emoji, title, examples, period }: { emoji: string; title: string; examples: string[], period: string }) {
  return (
    <div className="neu-in p-6 rounded-2xl hover:scale-[1.02] transition-transform">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold text-gray-100 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {examples.map((ex, i) => (
          <span key={i} className="text-xs px-2 py-1 rounded bg-background/50 text-gray-400 border border-white/5">
            {ex}
          </span>
        ))}
      </div>
      <div className="text-xs text-accent text-right font-mono mt-auto pt-2 border-t border-white/5">
        周期: {period}
      </div>
    </div>
  );
}

function WorkflowItem({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
            {step}
        </div>
        <div>
            <h4 className="text-gray-200 font-bold text-sm block">{title}</h4>
            <p className="text-xs text-gray-400">{desc}</p>
        </div>
    </div>
  );
}

function ContractCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="neu-in p-4 rounded-xl hover:bg-white/5 transition-colors">
      <h4 className="font-mono text-primary font-bold mb-2 text-sm">{name}</h4>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureList({ text }: { text: string }) {
  return (
      <li className="flex items-start gap-2 text-sm text-gray-300">
          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          <span>{text}</span>
      </li>
  );
}

function DataValueCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="neu-in p-5 rounded-xl flex items-start gap-4 hover:translate-x-1 transition-transform border border-white/5">
        <div className="p-3 rounded-lg bg-background text-accent shrink-0 border border-white/5">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-gray-100 mb-1">{title}</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
        </div>
    </div>
  );
}