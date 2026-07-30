# Stock Firebase Repositories — ASG Reception Hub

## Repository Matrix

| Repository | localStorage | Firebase Firestore | Collections |
|-----------|-------------|-------------------|-------------|
| StockCatalogueRepository | ✅ | ✅ | stockItems |
| StockInventoryRepository | ✅ | ✅ | stockInventory |
| StockCategoryRepository | ✅ | ✅ | stockCategories |
| SupplierRepository | ✅ | ✅ | suppliers |
| StockMovementRepository | ✅ | ✅ | stockMovements |

## Provider Wiring

The app selects provider via \VITE_DATA_PROVIDER\ env var:
- \local\ — localStorage repos (default, no Firebase required)
- \irebase\ — Firestore repos

\getProvider()\ in \src/firebase/config.ts\ returns the active provider.

## Firestore Security Rules

- **stockItems**: read = authenticated, write = admin only
- **stockInventory**: read = authenticated, **direct write denied** — use \pplyStockMovement\ callable
- **stockCategories**: read = authenticated, write = admin only
- **suppliers**: read = authenticated, write = admin only
- **stockMovements**: read = authenticated, **direct write denied** — use \pplyStockMovement\ callable
- All collections covered by deny-by-default catch-all

## Callable Function

\pplyStockMovement\ (australia-southeast1):
- Server derives: uid, displayName, role, isAdmin from Firebase Auth claims
- Rejects: unauthenticated, invalid types, inactive items, NaN, zero change, negative stock without admin override
- Transactionally updates inventory + creates movement in one Firestore transaction
