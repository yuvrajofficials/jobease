import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TopBar } from './TopBar';
import { DatasetExplorer } from '../sidebar/DatasetExplorer';
import { EditorArea } from '../editor/EditorArea';
import { BottomPanel } from './BottomPanel';
import { useMainframe } from '../../context/MainframeContext';

export const MainLayout = () => {
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const { activeMember, openTab, activeTabId } = useMainframe();

  React.useEffect(() => {
    if (activeMember) {
      openTab(activeMember);
    }
  }, [activeMember, openTab]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <TopBar />
      
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full overflow-auto">
              <DatasetExplorer />
            </div>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
          
          <Panel>
            <PanelGroup direction="vertical">
              <Panel>
                <div className="h-full overflow-hidden">
                  <EditorArea />
                </div>
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-blue-500 transition-colors" />
              
              <Panel defaultSize={30} minSize={20} maxSize={40}>
                <div className="h-full overflow-hidden">
                  <BottomPanel />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};