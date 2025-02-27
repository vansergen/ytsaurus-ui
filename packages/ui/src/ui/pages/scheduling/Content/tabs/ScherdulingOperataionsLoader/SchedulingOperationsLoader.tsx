import React from 'react';
import {getSchedulingOperationsLoadingStatus} from '../../../../../store/selectors/scheduling/scheduling-operations';
import {useSelector} from 'react-redux';
import Loader from '../../../../../components/Loader/Loader';

function SchedulingOperationsLoader() {
    const loading = useSelector(getSchedulingOperationsLoadingStatus);
    return <Loader visible={loading} />;
}

export default React.memo(SchedulingOperationsLoader);
