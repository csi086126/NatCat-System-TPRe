import React from 'react'
import { TableCell } from "@/components/ui/table";

const ProjectStatusCell = ({ project }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed':
        return { color: 'green' }
      case 'Loading':
        return { color: 'red' }
      default:
        return {}
    }
  }

  return (
    <TableCell style={getStatusStyle(project.status)}>
      {project.status}
    </TableCell>
  )
}

export default ProjectStatusCell