/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import fetchMock from 'fetch-mock';
import {
  fireEvent,
  render,
  within,
  screen,
} from 'spec/helpers/testing-library';
import { FeatureFlag } from '@superset-ui/core';
import {
  OPEN_FILTER_BAR_WIDTH,
  CLOSED_FILTER_BAR_WIDTH,
} from 'src/dashboard/constants';
import DashboardBuilder from 'src/dashboard/components/DashboardBuilder/DashboardBuilder';
import useStoredSidebarWidth from 'src/components/ResizableSidebar/useStoredSidebarWidth';
import {
  fetchFaveStar,
  setActiveTab,
  setDirectPathToChild,
} from 'src/dashboard/actions/dashboardState';
import {
  dashboardLayout as undoableDashboardLayout,
  dashboardLayoutWithTabs as undoableDashboardLayoutWithTabs,
} from 'spec/fixtures/mockDashboardLayout';
import { storeWithState } from 'spec/fixtures/mockStore';
import mockState from 'spec/fixtures/mockState';
import { DASHBOARD_ROOT_ID } from 'src/dashboard/util/constants';
import * as useNativeFiltersModule from './state';

fetchMock.get('glob:*/csstemplateasyncmodelview/api/read', {});
fetchMock.put('glob:*/api/v1/dashboard/*', {});
// Add mock for logging endpoint
fetchMock.post('glob:*/superset/log/?*', {});

jest.mock('src/dashboard/actions/dashboardState', () => ({
  ...jest.requireActual('src/dashboard/actions/dashboardState'),
  fetchFaveStar: jest.fn(),
  setActiveTab: jest.fn(),
  setDirectPathToChild: jest.fn(),
}));
jest.mock('src/components/ResizableSidebar/useStoredSidebarWidth');

// mock following dependent components to fix the prop warnings
jest.mock('@superset-ui/core/components/Select/Select', () => () => (
  <div data-test="mock-select" />
));
jest.mock('@superset-ui/core/components/Select/AsyncSelect', () => () => (
  <div data-test="mock-async-select" />
));
jest.mock('@superset-ui/core/components/PageHeaderWithActions', () => ({
  PageHeaderWithActions: () => (
    <div data-test="mock-page-header-with-actions" />
  ),
}));
jest.mock(
  'src/dashboard/components/nativeFilters/FiltersConfigModal/FiltersConfigModal',
  () => () => <div data-test="mock-filters-config-modal" />,
);
jest.mock('src/dashboard/components/BuilderComponentPane', () => () => (
  <div data-test="mock-builder-component-pane" />
));
jest.mock('src/dashboard/components/nativeFilters/FilterBar', () => () => (
  <div data-test="mock-filter-bar" />
));
jest.mock('src/dashboard/containers/DashboardGrid', () => () => (
  <div data-test="mock-dashboard-grid" />
));

describe('DashboardBuilder', () => {
  let favStarStub: jest.Mock;
  let activeTabsStub: jest.Mock;

  beforeAll(() => {
    // this is invoked on mount, so we stub it instead of making a request
    favStarStub = (fetchFaveStar as jest.Mock).mockReturnValue({
      type: 'mock-action',
    });
    activeTabsStub = (setActiveTab as jest.Mock).mockReturnValue({
      type: 'mock-action',
    });
    (useStoredSidebarWidth as jest.Mock).mockImplementation(() => [
      100,
      jest.fn(),
    ]);
  });

  afterAll(() => {
    favStarStub.mockReset();
    activeTabsStub.mockReset();
    (useStoredSidebarWidth as jest.Mock).mockReset();
  });

  function setup(overrideState = {}) {
    return render(<DashboardBuilder />, {
      useRedux: true,
      store: storeWithState({
        ...mockState,
        dashboardLayout: undoableDashboardLayout,
        ...overrideState,
      }),
      useDnd: true,
      useTheme: true,
    });
  }

  it('should render a StickyContainer with class "dashboard"', () => {
    const { getByTestId } = setup();
    const stickyContainer = getByTestId('dashboard-content-wrapper');
    expect(stickyContainer).toHaveClass('dashboard');
  });

  it('should add the "dashboard--editing" class if editMode=true', () => {
    const { getByTestId } = setup({
      dashboardState: { ...mockState.dashboardState, editMode: true },
    });
    const stickyContainer = getByTestId('dashboard-content-wrapper');
    expect(stickyContainer).toHaveClass('dashboard dashboard--editing');
  });

  it('should render a DragDroppable DashboardHeader', () => {
    const { queryByTestId } = setup();
    const header = queryByTestId('dashboard-header-container');
    expect(header).toBeInTheDocument();
  });

  it('should render a Sticky top-level Tabs if the dashboard has tabs', async () => {
    const { findAllByTestId } = setup({
      dashboardLayout: undoableDashboardLayoutWithTabs,
    });
    const sticky = await findAllByTestId('nav-list');

    expect(sticky.length).toBe(1);
    expect(sticky[0]).toHaveAttribute('id', 'TABS_ID');

    const dashboardTabComponents = within(sticky[0]).getAllByRole('tab');
    const tabChildren =
      undoableDashboardLayoutWithTabs.present.TABS_ID.children;
    expect(dashboardTabComponents.length).toBe(tabChildren.length);
    tabChildren.forEach((tabId, i) => {
      const idMatcher = new RegExp(`${tabId}$`);
      expect(dashboardTabComponents[i]).toHaveAttribute(
        'id',
        expect.stringMatching(idMatcher),
      );
    });
  });

  it('should render one Tabs and two TabPane', async () => {
    const { findAllByRole } = setup({
      dashboardLayout: undoableDashboardLayoutWithTabs,
    });
    const tabs = await findAllByRole('tablist');
    expect(tabs.length).toBe(1);
    const tabPanels = await findAllByRole('tabpanel');
    expect(tabPanels.length).toBe(2);
  });

  it('should render a TabPane and DashboardGrid for first Tab', async () => {
    const { findByTestId } = setup({
      dashboardLayout: undoableDashboardLayoutWithTabs,
    });
    const parentSize = await findByTestId('grid-container');
    const first_tab = screen.getByText('tab1');
    expect(first_tab).toBeInTheDocument();
    const tabPanels = within(parentSize).getAllByRole('tabpanel', {
      // to include invisible tab panels
      hidden: false,
    });
    expect(
      within(tabPanels[0]).getAllByTestId('mock-dashboard-grid').length,
    ).toBe(1);
  });

  it('should render a TabPane and DashboardGrid for second Tab', async () => {
    const { findByTestId } = setup({
      dashboardLayout: undoableDashboardLayoutWithTabs,
      dashboardState: {
        ...mockState.dashboardState,
        directPathToChild: [DASHBOARD_ROOT_ID, 'TABS_ID', 'TAB_ID2'],
      },
    });
    const parentSize = await findByTestId('grid-container');
    const second_tab = screen.getByText('tab2');
    expect(second_tab).toBeInTheDocument();
    fireEvent.click(second_tab);
    const tabPanels = within(parentSize).getAllByRole('tabpanel', {
      // to include invisible tab panels
      hidden: true,
    });
    expect(
      within(tabPanels[0]).getAllByTestId('mock-dashboard-grid').length,
    ).toBe(1);
  });

  it('should render a BuilderComponentPane if editMode=false and user selects "Insert Components" pane', () => {
    const { queryAllByTestId } = setup();
    const builderComponents = queryAllByTestId('mock-builder-component-pane');
    expect(builderComponents.length).toBe(0);
  });

  it('should render a BuilderComponentPane if editMode=true and user selects "Insert Components" pane', () => {
    const { queryAllByTestId } = setup({
      dashboardState: { ...mockState.dashboardState, editMode: true },
    });
    const builderComponents = queryAllByTestId('mock-builder-component-pane');
    expect(builderComponents.length).toBeGreaterThanOrEqual(1);
  });

  it('should change redux state if a top-level Tab is clicked', async () => {
    (setDirectPathToChild as jest.Mock).mockImplementation(arg0 => ({
      type: 'type',
      arg0,
    }));
    const { findByRole } = setup({
      dashboardLayout: undoableDashboardLayoutWithTabs,
    });
    const tabList = await findByRole('tablist');
    const tabs = within(tabList).getAllByRole('tab');
    expect(setDirectPathToChild).toHaveBeenCalledTimes(0);
    fireEvent.click(tabs[1]);
    expect(setDirectPathToChild).toHaveBeenCalledWith([
      'ROOT_ID',
      'TABS_ID',
      'TAB_ID2',
    ]);
    (setDirectPathToChild as jest.Mock).mockReset();
  });

  it('should not display a loading spinner when saving is not in progress', () => {
    const { queryByAltText } = setup();

    expect(queryByAltText('Loading...')).not.toBeInTheDocument();
  });

  it('should display a loading spinner when saving is in progress', async () => {
    const { findByAltText } = setup({
      dashboardState: { ...mockState.dashboardState, dashboardIsSaving: true },
    });

    expect(await findByAltText('Loading...')).toBeVisible();
  });

  it('should set FilterBar width by useStoredSidebarWidth', () => {
    const expectedValue = 200;
    const setter = jest.fn();
    (useStoredSidebarWidth as jest.Mock).mockImplementation(() => [
      expectedValue,
      setter,
    ]);
    const { getByTestId } = setup({
      dashboardInfo: {
        ...mockState.dashboardInfo,
        dash_edit_perm: true,
      },
    });
    const filterbar = getByTestId('dashboard-filters-panel');
    expect(filterbar).toHaveStyleRule('width', `${expectedValue}px`);
  });

  it('filter panel state when featureflag is true', () => {
    window.featureFlags = {
      [FeatureFlag.FilterBarClosedByDefault]: true,
    };
    const setter = jest.fn();
    (useStoredSidebarWidth as jest.Mock).mockImplementation(() => [
      CLOSED_FILTER_BAR_WIDTH,
      setter,
    ]);
    const { getByTestId } = setup({
      dashboardInfo: {
        ...mockState.dashboardInfo,
        dash_edit_perm: true,
      },
    });

    const filterbar = getByTestId('dashboard-filters-panel');
    expect(filterbar).toHaveStyleRule('width', `${CLOSED_FILTER_BAR_WIDTH}px`);
  });

  it('filter panel state when featureflag is false', () => {
    window.featureFlags = {
      [FeatureFlag.FilterBarClosedByDefault]: false,
    };
    const setter = jest.fn();
    (useStoredSidebarWidth as jest.Mock).mockImplementation(() => [
      OPEN_FILTER_BAR_WIDTH,
      setter,
    ]);
    const { getByTestId } = setup({
      dashboardInfo: {
        ...mockState.dashboardInfo,
        dash_edit_perm: true,
      },
    });

    const filterbar = getByTestId('dashboard-filters-panel');
    expect(filterbar).toHaveStyleRule('width', `${OPEN_FILTER_BAR_WIDTH}px`);
  });

  it('should not render the filter bar when nativeFiltersEnabled is false', () => {
    jest.spyOn(useNativeFiltersModule, 'useNativeFilters').mockReturnValue({
      showDashboard: true,
      missingInitialFilters: [],
      dashboardFiltersOpen: true,
      toggleDashboardFiltersOpen: jest.fn(),
      nativeFiltersEnabled: false,
    });
    const { queryByTestId } = setup();

    expect(queryByTestId('dashboard-filters-panel')).not.toBeInTheDocument();
  });

  it('should render the filter bar when nativeFiltersEnabled is true and not in edit mode', () => {
    jest.spyOn(useNativeFiltersModule, 'useNativeFilters').mockReturnValue({
      showDashboard: true,
      missingInitialFilters: [],
      dashboardFiltersOpen: true,
      toggleDashboardFiltersOpen: jest.fn(),
      nativeFiltersEnabled: true,
    });
    const { queryByTestId } = setup();

    expect(queryByTestId('dashboard-filters-panel')).toBeInTheDocument();
  });

  it('should not render the filter bar when in edit mode even if nativeFiltersEnabled is true', () => {
    jest.spyOn(useNativeFiltersModule, 'useNativeFilters').mockReturnValue({
      showDashboard: true,
      missingInitialFilters: [],
      dashboardFiltersOpen: true,
      toggleDashboardFiltersOpen: jest.fn(),
      nativeFiltersEnabled: true,
    });
    const { queryByTestId } = setup({
      dashboardState: { ...mockState.dashboardState, editMode: true },
    });

    expect(queryByTestId('dashboard-filters-panel')).not.toBeInTheDocument();
  });
});
