import _ from 'lodash';
import {ThunkAction} from 'redux-thunk';
import {
    DynTablesStateModalAction,
    DynTablesStateModalState,
    TabletStateAction,
    TabletStateType,
} from '../../../../store/reducers/navigation/modals/dyn-tables-state-modal';
import {RootState} from '../../../../store/reducers';
import {DYN_TABLES_STATE_MODAL_PARTIAL} from '../../../../constants/navigation/modals/dyn-tables-state-modal';
import {delayed, wrapApiPromiseByToaster} from '../../../../utils/utils';
import {updateView} from '../index';
import {DYN_TABLES_ALLOWED_STATES_OF_ACTION} from '../../../selectors/navigation/content/map-node-ts';
import {executeBatchWithRetries} from '../../execute-batch';
import {YTApiId} from '../../../../rum/rum-wrap-api';

type DynTablesStateThunkAction = ThunkAction<any, RootState, any, DynTablesStateModalAction>;

export function showDynTablesStateModalByPaths(
    paths: Array<string>,
    action: Required<DynTablesStateModalState>['action'],
): DynTablesStateModalAction {
    return {
        type: DYN_TABLES_STATE_MODAL_PARTIAL,
        data: {paths, action, showModal: true},
    };
}

export function showDynTablesStateModalByNodes(
    action: Required<DynTablesStateModalState>['action'],
    selectedNodes: Array<{path: string; tabletState: TabletStateType}>,
): DynTablesStateThunkAction {
    return (dispatch) => {
        const allowedFrom = DYN_TABLES_ALLOWED_STATES_OF_ACTION[action];
        const paths = _.reduce(
            selectedNodes,
            (acc, {path, tabletState}) => {
                if (tabletState && allowedFrom[tabletState]) {
                    acc.push(path);
                }
                return acc;
            },
            [] as Array<string>,
        );

        dispatch({
            type: DYN_TABLES_STATE_MODAL_PARTIAL,
            data: {paths, action, showModal: true},
        });
    };
}

export function hideDynTablesStateModal() {
    return {
        type: DYN_TABLES_STATE_MODAL_PARTIAL,
        data: {paths: [], action: undefined, showModal: false},
    };
}

export function dynTablesChangeState(
    paths: Array<string>,
    action: TabletStateAction,
): DynTablesStateThunkAction {
    return (dispatch) => {
        const requests = _.map(paths, (path) => {
            return {
                command: `${action}_table` as const,
                parameters: {path},
            };
        });

        return wrapApiPromiseByToaster(
            executeBatchWithRetries(YTApiId.navigationDynTableState, requests),
            {
                toasterName: 'dyn_tables_change_state_to_' + action,
                successContent: '',
                isBatch: true,
                skipSuccessToast: true,
                batchError: `Cannot perform ${action} action`,
            },
        )
            .then(() => {
                return wrapApiPromiseByToaster(waitWhileThereIsTransient(paths, action), {
                    toasterName: 'dyn_tables_wait_while_transient_' + action,
                    successContent: `${_.capitalize(action)} completed`,
                    isBatch: true,
                    batchError: `Cannot perform ${action} action`,
                });
            })
            .then(() => {
                dispatch(updateView());
            });
    };
}

function waitWhileThereIsTransient(paths: Array<string>, action: TabletStateAction): Promise<void> {
    const requests = _.map(paths, (path) => {
        return {
            command: 'get' as const,
            parameters: {path: `${path}/@tablet_state`},
        };
    });

    const res = delayed(
        () => executeBatchWithRetries(YTApiId.navigationGetTabletState, requests),
        3000,
    ) as any;

    return wrapApiPromiseByToaster<Array<{output: string}>>(res, {
        toasterName: 'dyn_tables_wait_while_transient_' + action,
        successContent: `${_.capitalize(action)} completed`,
        skipSuccessToast: true,
        isBatch: true,
        batchError: `Cannot perform ${action} action`,
    }).then((results) => {
        const toRecheck = _.reduce(
            results,
            (acc, {output}, index) => {
                if (output === 'transient') {
                    acc.push(paths[index]);
                }
                return acc;
            },
            [] as typeof paths,
        );

        if (toRecheck.length) {
            return waitWhileThereIsTransient(toRecheck, action);
        }
        return Promise.resolve();
    });
}
