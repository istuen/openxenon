grammar OXN

// ==================== Entry Point ====================
entry OXNDocument:
    entities+=TopLevelEntity*;

TopLevelEntity:
    ProbeDeclaration
    | PartDeclaration
    | BlueprintDeclaration
    | DomainDeclaration
    | WorkDeclaration
    | ProofDeclaration;

// ==================== Type System ====================
TypeReference:
    PrimitiveType
    | GenericType
    | EnumType
    | AnyType;

PrimitiveType returns string:
    'string' | 'number' | 'boolean';

GenericType:
    container=('list' | 'map') '<' inner=TypeReference '>';

EnumType:
    'enum' '(' values+=STRING (',' values+=STRING)* ')';

AnyType:
    {infer AnyTypeRef} 'any';

// ==================== Simple Value Types ====================
BooleanLiteral returns boolean:
    'true' | 'false';

NullLiteral:
    {infer NullLit} 'null';

// ==================== Expressions ====================
Expression:
    OrExpression;

OrExpression infers Expression:
    AndExpression ({infer BinaryExpr.left=current} op='||' right=AndExpression)*;

AndExpression infers Expression:
    CompareExpression ({infer BinaryExpr.left=current} op='&&' right=CompareExpression)*;

CompareExpression infers Expression:
    AddExpression ({infer BinaryExpr.left=current} op=('==' | '!=' | '<' | '>' | '<=' | '>=') right=AddExpression)?;

AddExpression infers Expression:
    TernaryExpr ({infer BinaryExpr.left=current} op=('+' | '-') right=TernaryExpr)*;

TernaryExpr infers Expression:
    PrimaryExpression ({infer TernaryExpr.condition=current} '?' then=Expression ':' else=Expression)?;

PrimaryExpression infers Expression:
    Literal
    | VariableRef
    | TemplateString
    | '(' Expression ')';

Literal infers Expression:
    {infer LiteralExpr} (STRING | NUMBER | BooleanLiteral | NullLiteral);

VariableRef:
    path=QualifiedName;

QualifiedName:
    (prefix=('prop' | 'param' | 'task' | 'parts') '.')? name=ID ('.' segments+=ID)*;

TemplateString:
    value=TEMPLATE_STRING;

// ==================== Probe ====================
// Probe 实体声明（资产定义，位于全局目录）
// v0.2 T10 (OXL 1.3): 加可选 'scheme' ':' scheme=STRING 字段
//   - 默认从 target URI 前缀推断; 显式声明用于: (1) target 缺失时寻址 (2) cli-add probe 跨域
//   - 静态校验由 src/oxl/validators/probe-validator.ts 承担 (3 规则)
ProbeDeclaration:
    'probe' name=STRING '{'
        ('scheme' ':' scheme=STRING)?
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (output+=ProbeOutputDeclaration)?
    '}';

Description:
    'description' '=' value=STRING;

PropDeclaration:
    'prop' name=STRING '{'
        'type' '=' type=TypeReference ';'
        (required=RequiredModifier ';'?)?
        (default=DefaultValue ';'?)?
    '}';

RequiredModifier:
    'required' '=' value=BooleanLiteral;

DefaultValue:
    'default' '=' value=Expression;

ProbeOutputDeclaration:
    'output' '{' (fields+=OutputField (';' fields+=OutputField)* ';'?)? '}';

OutputField:
    name=ID '=' type=TypeReference;

// ==================== Part ====================
// Part 实体声明（资产定义，位于全局目录）
PartDeclaration:
    'part' name=STRING '{'
        (descriptions+=Description)?
        (skill=PartSkill)?
        (props+=PropDeclaration)*
        (probes+=PartProbeDeclaration)*
        (observe+=ObserveDeclaration)*
        ('execution' '=' '[' refs+=ExecutionRef (',' refs+=ExecutionRef)* ','? ']')?
    '}';

// ==================== Part Skill (AI Action Context) ====================
PartSkill:
    'skill' '{'
        ('lifecycle' '=' lifecycle=STRING ';')?
        ('objective' '=' objective=STRING ';')?
        ('acceptance' '=' '[' acceptance+=STRING (',' acceptance+=STRING)* ','? ']' ';')?
        ('guidance' '=' guidance=STRING ';')?
    '}';

PartProbeDeclaration:
    'probe' name=ID 'align' align=STRING 'ref' ref=STRING '{'
        ('params' '=' params=ParamsBlock)?
    '}';

ObserveDeclaration:
    'observe' '=' '[' observes+=STRING (',' observes+=STRING)* ']';

ExecutionRef:
    ref=[PartProbeDeclaration:ID];

// ==================== Params Block ====================
ParamsBlock:
    '{' (pairs+=ParamPair (',' pairs+=ParamPair)* ','?)? '}';

ParamPair:
    key=ID '=' value=Expression;

// ==================== Blueprint ====================
// Blueprint 实体声明（技术流水线模板，位于全局目录）
// v0.1-final: 移除 expectation 和 rule，保留 observe 数组形式
BlueprintDeclaration:
    'blueprint' name=STRING '{'
        ('version' '=' version=NUMBER)?
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (partSlots+=PartSlotDeclaration)*
    '}';

PartSlotDeclaration:
    'slot' name=STRING '{'
        ('deps' '=' '[' (deps+=STRING (',' deps+=STRING)*)? ']')?
        (observe+=ObserveDeclaration)?
    '}';

// ==================== Domain (v0.1-final DDD) ====================
// Domain 是绝对自治的业务契约，定义统一语言和不变量
// v0.1-final: noun/verb → term (map格式), domain_rules → invariant
// v0.1.1: 允许多个 invariant 块（domain 文件可写多段不变量）；context_map 已移除
DomainDeclaration:
    'domain' name=STRING '{'
        (descriptions+=Description)?
        (terms=TermBlock)?
        (ban=BanBlock)?
        (invariants+=InvariantBlock)*
    '}';

TermBlock:
    'term' '{'
        (terms+=TermDecl)*
    '}';

TermDecl:
    name=STRING ':' desc=STRING ';'?;

BanBlock:
    'ban' '{'
        (bans+=STRING (',' bans+=STRING)*)?
    '}' ';'?;

InvariantBlock:
    'invariant' '{'
        (invariants+=InvariantDecl)*
    '}' ';'?;

// v0.2 T11 (Three-Layer Proof v2 PR-1):
//   加 script / manual / scope 三个可选字段 (与老 value=STRING 兼容)
//   script= 脚本 exit 0=pass, 1=fail; manual= 人工判定; scope= 作用范围 (work/domain/project)
InvariantDecl:
    value=STRING ';'?                               // 老: 裸字符串
  | 'script' '=' script=STRING ';'?                 // v0.2 T11
  | 'manual' '=' manual=STRING ';'?                 // v0.2 T11
  | 'scope' '=' scope=STRING ';'?                   // v0.2 T11
;

// ==================== Work (v0.1-final: workspace orchestrator) ====================
// Work 是编排空间：资源池寻址 + Task 编排中心
// v0.1-final: use_domain/use_blueprint → domain/blueprint/part/probe ref 语法
WorkDeclaration:
    'work' name=STRING '{'
        (context=WorkContext)?
        (domains+=DomainRefDecl)*
        (blueprints+=BlueprintRefDecl)*
        (parts+=PartRefDecl)*
        (probes+=ProbeRefDecl)*
        (domainProofs+=DomProofRef)*          // v0.2 T11: 在 tasks 之前声明 (语法层优先于执行流)
        (tasks+=TaskDeclaration)*
    '}';

DomProofRef:
    'proofs' '[' (entries+=STRING (',' entries+=STRING)*)? ']' ';'?;

DomainRefDecl:
    'domain' name=STRING ('as' alias=STRING)? ('ref' ref=STRING)? ';';

BlueprintRefDecl:
    'blueprint' name=STRING ('as' alias=STRING)? ('ref' ref=STRING)? ';';

PartRefDecl:
    'part' name=STRING ('as' alias=STRING)? ('ref' ref=STRING)? ';';

ProbeRefDecl:
    'probe' name=STRING ('as' alias=STRING)? ('ref' ref=STRING)? ';';

// ==================== Proof (v0.1.2: Proof-First 入口) ====================
// Proof 是 IAP 中 Proof 轴的独立运作：工程师跳过 Domain/Blueprint 资产化，
// 直接用 Probe 声明验收标准，由 Core 产出不可篡改的 frozen.json。
// 物理边界：.openxenon/proofs/<name>/proof.oxn + frozen.json
ProofDeclaration:
    'proof' name=STRING '{'
        (descriptions+=Description)?
        (probes+=ProofProbeDecl)*
    '}';

ProofProbeDecl:
    'probe' name=STRING '{'
        'ref' ref=STRING
        ('params' params=ParamsBlock)?
    '}';

// ==================== Task (v0.1-final: align 执行器) ====================
// Task 将业务意图和技术意图插入留白的具体动作
// v0.1-final: inject → domain/blueprint/part/probe 声明式对齐
// v0.0.28+: deps 字段加 'deps' '=' 关键字引导 parser disambiguation。
//           唯一合法写法：deps = ["t1", "t2"]。裸数组 / deps [...] / 重复 deps 全部拒绝。
TaskDeclaration:
    'task' name=STRING '{'
        ('domain' domain=STRING)?
        ('blueprint' blueprint=STRING)?
        (parts+=TaskPartDecl)*
        (TaskDepsField)?
    '}';

TaskDeps:
    '[' (deps+=STRING (',' deps+=STRING)*)? ']'    // ["a", "b"]
    | STRING (',' STRING)+                          // "a", "b" (无括号)
    | STRING                                         // "a" (单元素无括号)
;
TaskDepsField:
    'deps' ':' deps=TaskDeps                        // 老兼容 (deps : [])
    | 'deps' '=' deps=TaskDeps                      // v0.0.28 后 (deps = [])
;

TaskPartDecl:
    'part' name=STRING '{'
        ('skill_context' '=' skill_context=STRING)?
        (probes+=TaskProbeDecl)*
    '}';

TaskProbeDecl:
    'probe' name=STRING '{'
        'ref' ref=STRING
        ('params' '=' params=ParamsBlock)?
    '}';

// ==================== Work Context (AI Global Context) ====================
WorkContext:
    'context' '{'
        ('goal' '=' goal=STRING ';')?
        ('constraints' '=' '[' (constraints+=STRING (',' constraints+=STRING)*)? ']' ';')?
        (loopPolicy=LoopPolicy)?
    '}';

LoopPolicy:
    'loop_policy' '{'
        ('max_iterations' '=' maxIterations=NUMBER ';')?
    '}';

// ==================== Terminals ====================
terminal ID: /[_a-zA-Z][\w-]*/;

terminal STRING returns string:
    /"[^"]*"/;

terminal NUMBER returns number:
    /[0-9]+(\.[0-9]+)?/;

terminal TEMPLATE_STRING returns string:
    /"([^"\\]|\\"|\$\{[^}]*\})*"/;

// ==================== Hidden Terminals ====================
hidden terminal WS:
    /\s+/;

hidden terminal ML_COMMENT:
    /\/\*[\s\S]*?\*\//;

hidden terminal SL_COMMENT:
    /\/\/[^\n\r]*/;
