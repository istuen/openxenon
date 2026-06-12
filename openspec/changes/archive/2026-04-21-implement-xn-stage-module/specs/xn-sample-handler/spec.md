## ADDED Requirements

### Requirement: XnSampleHandler

The system SHALL provide XnSampleHandler for sample branch management:

- `createSample(xnStageId, payload)`: Create a new sample branch
- `approveSample(sampleId)`: Approve sample and merge
- `rejectSample(sampleId)`: Reject sample

#### Scenario: Create sample branch
- **WHEN** XnStage execution fails and retry doesn't work
- **THEN** handler creates XnSample with status 'pending'

#### Scenario: Approve sample
- **WHEN** engineer approves the sample via API
- **THEN** sample status becomes 'approved', can be merged into original stage

#### Scenario: Reject sample
- **WHEN** engineer rejects the sample
- **THEN** sample status becomes 'rejected', original stage remains unchanged