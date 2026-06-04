grammar OXN

// ==================== Entry Point ====================
// Unified: mvp's `*` (multi-entity per file) replaces reference's single entry.
// v0.1 DDD extension: add Domain and Task top-level entities.
entry OXNDocument:
    entities+=TopLevelEntity*;

TopLevelEntity:
    ProbeDeclaration
    | PartDeclaration
    | BlueprintDeclaration
    | DomainDeclaration
    | TaskDeclaration
    | WorkDeclaration;

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
ProbeDeclaration:
    'probe' name=STRING ('align' align=STRING 'ref' ref=STRING)? '{'
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
/**
 * @oxn-ai-tool
 * {
 *   "name": "add_probe_to_part",
 *   "description": "给 Part 添加探针实例",
 *   "example": { "blueprint_name": "WebServer", "part_name": "Nginx", "probe_config": { "name": "http", "type": "HttpProbe", "params": { "path": "/health" } } }
 * }
 */
// Unified: Part now optionally carries a `skill` block (mvp extension) for AI
// action context, while still supporting `description + observe + execution`
// (reference semantics for human-aligned verification).
PartDeclaration:
    'part' name=STRING ('align' align=STRING)? ('ref' ref=STRING)? '{'
        (descriptions+=Description)?
        (skill=PartSkill)?
        (props+=PropDeclaration)*
        (probes+=PartProbeDeclaration)*
        (observe+=ObserveDeclaration)*
        ('execution' '=' '[' refs+=ExecutionRef (',' refs+=ExecutionRef)* ','? ']')?
    '}';

// ==================== Part Skill (AI Action Context) ====================
// New in unified grammar: AI-visible block describing what an agent should
// do for this part, how success is measured, and any extra guidance.
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
// Unified: Blueprint now optionally carries a `context` block (mvp
// extension) for blueprint-level AI action context.
BlueprintDeclaration:
    'blueprint' name=STRING
    '{'
        (context=WorkContext)?
        ('version' '=' version=NUMBER)?
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (partSlots+=PartSlotDeclaration)*
        (expectations+=ExpectationDeclaration)*
        (rules+=RuleDeclaration)*
    '}';

PartSlotDeclaration:
    'slot' name=STRING '{'
        ('deps' '=' '[' (deps+=STRING (',' deps+=STRING)*)? ']')?
        (observe+=ObserveDeclaration)?
    '}';

ExpectationDeclaration:
    'expectation' name=STRING '{'
        ('probe' '=' probe_ref=STRING)?
        ('params' '=' params=ParamsBlock)?
        ('err_msg' '=' err_msg=STRING)?
    '}';

RuleDeclaration:
    'rule' name=STRING '{'
        ('condition' '=' condition=Expression)?
        ('err_msg' '=' err_msg=STRING)?
    '}';

// ==================== Domain (NEW in v0.1 DDD) ====================
// Domain is a DDD Bounded Context. It owns:
//   - language { noun/verb/ban }   ubiquitous language of this context
//   - domain_rules { rule }        business invariants (documentation only in v0.1)
//   - context_map { imports }      explicit references to other domains (anti-corruption layer)
DomainDeclaration:
    'domain' name=STRING '{'
        (descriptions+=Description)?
        (language=DomainLanguage)?
        (domainRules=DomainRuleBlock)?
        (contextMap=ContextMapBlock)?
    '}';

DomainLanguage:
    'language' '{'
        (nouns+=NounDecl)*
        (verbs+=VerbDecl)*
        ('ban' '=' '[' (bans+=STRING (',' bans+=STRING)*)? ']' ';'?)?
    '}';

NounDecl:
    'noun' name=STRING 'desc' desc=STRING ';'?;

VerbDecl:
    'verb' name=STRING 'desc' desc=STRING ';'?;

DomainRuleBlock:
    'domain_rules' '{'
        (rules+=DomainRuleDecl)*
    '}';

DomainRuleDecl:
    'rule' name=STRING 'desc' desc=STRING ';'?;

ContextMapBlock:
    'context_map' '{'
        (imports+=ContextMapImport)*
    '}';

ContextMapImport:
    'imports' target=STRING 'as' alias=STRING ';'?;


// ==================== Task (NEW in v0.1) ====================
// A Task is the executable unit bound to exactly one Blueprint, optionally
// injecting one or more Domain language/rules into the AI context.
// File location: .openxenon/works/<work-name>/tasks/<task-name>/task.oxn
TaskDeclaration:
    'task' name=STRING 'blueprint' blueprint=STRING '{'
        (injects+=DomainInjectDecl)*
        (context=TaskContext)?
        (props+=PropDeclaration)*
        (partSlots+=PartSlotDeclaration)*
    '}';

DomainInjectDecl:
    'inject' domain=STRING ('as' alias=STRING)? ';';

TaskContext:
    'context' '{'
        ('objective' '=' objective=STRING ';')?
        ('constraints' '=' '[' (constraints+=STRING (',' constraints+=STRING)*)? ']' ';')?
    '}';

// ==================== Work (v0.1: workspace orchestrator) ====================
// v0.1: Work no longer refs a single blueprint. It becomes a workspace-level
// orchestrator that lists which Domain(s) and Blueprint(s) it uses, plus
// the task DAG inside this workspace.
// File location: .openxenon/works/<work-name>/work.oxn
WorkDeclaration:
    'work' name=STRING '{'
        (context=WorkContext)?
        (useDomains+=UseDomainDecl)*
        (useBlueprints+=UseBlueprintDecl)*
        (tasks+=TaskRefDecl)*
    '}';

UseDomainDecl:
    'use_domain' name=STRING ('as' alias=STRING)? ';';

UseBlueprintDecl:
    'use_blueprint' name=STRING ('as' alias=STRING)? ';';

TaskRefDecl:
    'task' name=STRING 'align' align=STRING '{'
        ('deps' '=' '[' (deps+=STRING (',' deps+=STRING)*)? ']' ';')?
        (props+=SlotPropBinding)*
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

// SlotBinding 仍然保留在 PartDeclaration 中以兼容旧 work 实体模式，
// 但 v0.1 推荐使用 WorkDeclaration 内的 task 块。
// Unified: SlotBinding now optionally carries a `skill` block (mvp
// extension) so work.oxn's part references can be self-describing.
SlotBinding:
    'part' name=STRING 'align' align=STRING ('ref' ref=STRING)? '{'
        (props+=SlotPropBinding)*
        (probeBindings+=ProbeBinding)*
        (skill=PartSkill)?
    '}';

ProbeBinding:
    'probe' name=STRING 'align' align=STRING 'ref' ref=STRING '{'
    '}';

SlotPropBinding:
    'prop' name=STRING '=' value=Expression;

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
