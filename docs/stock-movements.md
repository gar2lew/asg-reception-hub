# Stock Movements — ASG Reception Hub

## Architecture

Stock movements use a trusted server-side operation. The client sends only untrusted inputs (item ID, inventory ID, movement type, quantity, reason). The server derives identity and permissions from Firebase Auth claims and executes the movement in a single Firestore transaction.

## Callable Function: \pplyStockMovement\

### Client sends:
- stockItemId, stockInventoryId, movementType, quantity/observedQuantity, reason, notes (optional), overrideRequest (optional)

### Server derives:
- actorUid, actorDisplayName, role, isAdmin from Firebase Auth claims

### Validates:
- authenticated, active item, matching inventory, valid type, finite positive quantity, non-zero change, non-zero stocktake variance, reason provided, negative stock requires admin + reason

### Executes:
- Firestore transaction: update inventory.currentQuantity + create stockMovements document — atomic, all-or-nothing

## Movement Types

| Type | Sign | Input |
|------|------|-------|
| consumed | negative | positive quantity |
| damaged | negative | positive quantity |
| manual-adjustment | client-signed | positive or negative |
| stocktake-adjustment | server-calculated | observed quantity |
| correction | client-signed | signed quantity |

## Quantity Invariants

- No NaN, no Infinity, no zero change
- No negative consumption/damage input
- No resulting negative stock without admin override
- Admin override requires explicit reason
- Whole-number quantities by default (allowsFractionalQuantity = false on legacy items)

## Direct Quantity Edit Policy

- Direct client writes to stockInventory documents are **denied** by Firestore Rules
- Direct client writes to stockMovements documents are **denied** by Firestore Rules
- All quantity changes must go through \pplyStockMovement\
- Admin inventory setup (thresholds, target, reorder) is permitted via stockInventory admin writes

## Transfer Status

Office-to-office transfers are not yet implemented. The movement model includes transferred-in/transferred-out types, but the bidirectional atomic transaction is deferred to a future phase.
