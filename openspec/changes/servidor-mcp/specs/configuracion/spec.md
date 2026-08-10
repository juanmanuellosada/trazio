## ADDED Requirements

### Requirement: Sección Aplicaciones conectadas

Configuración SHALL ofrecer una sección "Aplicaciones conectadas" que
muestra cada aplicación autorizada por OAuth (por ejemplo, un asistente de
IA conectado por MCP) y permite revocar cada una individualmente. Rige el
mismo criterio de la capacidad `consentimiento-oauth`: listar y revocar.

#### Scenario: La sección aparece junto al resto de Configuración

- **WHEN** se abre el modal de Configuración
- **THEN** SHALL aparecer la sección "Aplicaciones conectadas" junto a las
  demás
