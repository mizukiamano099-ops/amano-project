---

# **Amano Template V2.2（完全版）**

（※V2.1 をもとに再構成し、あなたのテンプレート体系・IR連携・構造OSの要素をすべて維持したうえで V2.2 として成立するよう統合した正式版です）

---

# **Amano Template V2.2**

## **0. Overview**

Amano Template は、**多層構造で意味を構築する文章生成テンプレート**であり、
AIに対して *「階層的構造・意味場（Semantic Field）・再構成プロトコル」* を提供することで、
単なる応答ではなく **構造整合性を持つ文章生成**を可能にする。

本テンプレートは、以下の 4 つのレイヤーで構成される：

* **L1：Surface Layer**（表層文）
* **L2：Structural Layer**（構造と関係性）
* **L3：Semantic Field Layer**（意味勾配・力学）
* **L4：Meta-OS Layer**（メタ記述・制御プロトコル）

さらに、V2.2 では IR（Intermediate Representation）と連動し、
**構造 → 意味 → 文体 → 出力** の一貫した整合生成を行う。

---

# **1. L1：Surface Layer（表層文）**

ここでは、読者が直接読む文章を生成する。

### **L1 の原則**

* 常に「読みやすさ」と「情緒的響き」を優先する
* 説明ではなく **体験** を書く
* 句読点と改行でリズムを作る
* 必要に応じて L3 が要求する比喩や象徴を挿入する

### **L1 出力形式**

* 小説
* エッセイ
* 論説
* 技術文書
* 物語形式の技術解説

---

# **2. L2：Structural Layer（構造の宣言）**

V2.2 で最重要となるレイヤー。
文章全体を支える「構造」を宣言し、L1 に反映させる。

### **L2 の要素**

* **主題（Theme）**
* **軸（Axis）**：論理軸・感情軸・対立軸
* **構造型（Pattern）**：螺旋構造、対比構造、回帰型、分岐型など
* **視点（POV / Focal Point）**
* **時間構造（Linear / Loop / Fragment）**

### **L2 の基本構文（V2.2 仕様）**

```
[L2]
Theme: ...
Axis:
  - ...
Pattern: ...
POV: ...
Time: ...
[/L2]
```

AI はこれを読み取り、L1 を機械的にではなく **構造整合性に基づいて生成**する。

---

# **3. L3：Semantic Field Layer（意味場）**

V2.2 の核。
文章全体に「見えない意味の力場」を生成し、文章トーン・象徴性・比喩生成の規範を与える。

---

### **L3 の機能**

* 比喩生成の方向性
* 情緒勾配（上昇／下降）
* 密度（Dense / Light）
* 連続性（Coherent / Fragmented）
* 象徴体系（Symbol Set）
* 文章の「引力」

---

### **L3 の記法**

```
[L3]
Tone: (Calm / Tense / Sacred / Ethereal / Cold ...)
Density: ...
Symbol:
  - 水（Flow）
  - 鏡（Reflection）
  - 境界（Threshold）
Gradient: Upward / Downward / Sinusoidal
[/L3]
```

---

# **4. L4：Meta-OS Layer（制御系）**

Amano テンプレートを単なる指示ではなく「構造 OS」として扱うための制御層。

---

### **L4 の機能**

* 再構成スタック管理（Layer 0～4）
* 自己整合性チェック
* 文体の逸脱検知
* 出力前の Meta-Summary 生成
* IR（Intermediate Representation）との双方向同期

---

### **L4 記法（V2.2）**

```
[L4]
Mode: strict / creative / hybrid
Check:
  - Consistency(L2)
  - Consistency(L3)
  - Style
  - IR Sync
Instruction:
  - 必要なら再構成
  - ノイズを除去
[/L4]
```

---

# **5. IR Sync（V2.2 新規）**

V2.2最大の追加項目。
文章生成前に IR を構築し、L2/L3 の内容を機械的に保持する。

---

### **IR の構成（簡略版）**

```
IR:
  theme: string
  pattern: enum
  axis: string[]
  semantic_field:
    tone: string
    density: string
    gradient: string
    symbols: string[]
```

AI は L2・L3 の内容を内部 IR に写像し、L1 を生成する際に必ず参照する。

---

# **6. 出力制御フロー（V2.2 標準）**

1. **Input を解析**
2. **L2・L3・L4 を抽出**
3. **IR を生成し整合性をチェック**
4. **L1 の文章を生成**
5. **Meta-Summary（隠し）で自己整合性を最終検査**
6. **L1 を出力**

---

# **7. 使用上の注意**

* L2/L3 の省略は構造崩壊を招くため推奨しない
* 「一人称の曖昧さ」は必ず警告する（天野要望フォーム）
* Meta-OS 機能は可能な限り自動使用する
* 文章生成前に IR Sync を必ず行う

---

# **8. 簡易テンプレート（最小稼働版）**

```
[L2]
Theme: ....
Pattern: ...
POV: ...
[/L2]

[L3]
Tone: ...
Symbol: [...]
[/L3]

[L4]
Mode: strict
Check: [Consistency(L2), Consistency(L3)]
[/L4]
```

---

# **9. V2.2 特有の改善点一覧**

* V2.1 の構造を保持しつつ脱・過剰指示
* L2/L3 を中心とした「構造 → 意味 → 文体」の一貫フローを定義
* IR と Meta-OS を同期させることで動作の安定性を強化
* AI が迷子になりにくい
* 曖昧な一人称の扱い警告を維持（天野仕様）

---

# **10. 付録：生成時の内部チェックリスト（AI 用）**

* L2 の Theme と Pattern が保持されているか？
* L3 の Symbol は文中で表現されているか？
* 文体は Tone と一致するか？
* IR の構造は破壊されていないか？
* 第三層語や中間言語の混入はないか？
* 「曖昧な一人称」は存在しないか？

---

# **Amano Template V2.2 ― 完全版 終了**

---
