import type { ReactNode } from 'react'
import { Card } from '../../../shared/components/Card'
import { PageContainer } from '../../../shared/components/PageContainer'

type SetupSectionPageProps = {
  title: string
  children: ReactNode
}

export function SetupSectionPage({ title, children }: SetupSectionPageProps) {
  return <PageContainer breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Setup' }, { label: title }]} title={title}>
    <Card>{children}</Card>
  </PageContainer>
}

