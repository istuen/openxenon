grammar OXN

// ==================== Entry Point ====================
entry OXNDocument:
    entities+=TopLevelEntity;

TopLevelEntity:
    ProbeDeclaration
    | PartDeclaration
    | BlueprintDeclaration
    | TaskDeclaration;

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
    (prefix=('prop' | 'param' | 'task') '.')? name=ID ('.' segments+=ID)*;

TemplateString:
    value=TEMPLATE_STRING;

// ==================== Probe ====================
ProbeDeclaration:
    'probe' name=STRING '{'
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
PartDeclaration:
    'part' name=STRING '{'
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (probes+=PartProbeDeclaration)*
        ('execution' '=' '[' refs+=ExecutionRef (',' refs+=ExecutionRef)* ','? ']')?
    '}';

PartProbeDeclaration:
    'probe' name=ID ('ref' ref=STRING)? '{'
        ('params' '=' params=ParamsBlock)?
    '}';

ExecutionRef:
    ref=[PartProbeDeclaration:ID];

// ==================== Params Block ====================
ParamsBlock:
    '{' (pairs+=ParamPair (',' pairs+=ParamPair)* ','?)? '}';

ParamPair:
    key=ID '=' value=Expression;

// ==================== Blueprint ====================
BlueprintDeclaration:
    'blueprint' name=STRING '{'
        ('version' '=' version=NUMBER)?
        (descriptions+=Description)?
        (props+=PropDeclaration)*
        (parts+=PartInBlueprint)*
        (partSlots+=PartSlotDeclaration)*
        (expectations+=ExpectationDeclaration)*
        (rules+=RuleDeclaration)*
    '}';

PartInBlueprint:
    'part' name=STRING 'ref' ref=STRING '{'
        (propBindings+=PartPropBinding)*
        ('deps' '=' '[' (deps+=STRING (',' deps+=STRING)* ','?)? ']')?
    '}';

PartPropBinding:
    'prop' name=ID '=' value=Expression;

PartSlotDeclaration:
    'part' 'slot' name=STRING '{'
        ('deps' '=' '[' deps+=STRING (',' deps+=STRING)* ','? ']')?
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

// ==================== Task ====================
TaskDeclaration:
    'task' name=STRING ('use' use=STRING)? '{'
        (slotBindings+=SlotBinding)*
    '}';

SlotBinding:
    'part' 'slot' slot=STRING ('ref' ref=STRING)? '{'
        (props+=SlotPropBinding)*
    '}';

SlotPropBinding:
    'prop' name=ID '=' value=Expression;

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
