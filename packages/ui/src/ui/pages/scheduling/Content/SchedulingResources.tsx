import React from 'react';
import {useSelector} from 'react-redux';
import cn from 'bem-cn-lite';
import _ from 'lodash';

import hammer from '../../../common/hammer';
import {getIsRoot, getResources} from '../../../store/selectors/scheduling/scheduling';
import {Progress} from '@gravity-ui/uikit';

import './SchedulingResources.scss';

const block = cn('scheduling-resources');
const headingBlock = cn('elements-heading');

function SchedulingResources() {
    const isRoot = useSelector(getIsRoot);
    const resources = useSelector(getResources) as any;

    return !isRoot ? null : (
        <div className={block()}>
            {_.map(resources, (resource) => (
                <div className={block('resources-item')} key={resource.type}>
                    <div className={headingBlock({size: 's'})}>
                        {hammer.format['ReadableField'](resource.type)}
                    </div>
                    <Progress {...resource.progress} />
                </div>
            ))}
        </div>
    );
}

export default React.memo(SchedulingResources);
